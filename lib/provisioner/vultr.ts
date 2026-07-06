// VultrProvisioner — the real adapter (opt-in via ACRE_PROVISIONER=vultr). It
// drives a tenant through the SAME five display steps the mock does, but each step
// is a genuine Vultr API call, and the real resource ids land in tenant.isolation
// so the badge proves actual infrastructure:
//
//   slice    POST /v2/instances   → a fractional-GPU VM (the tenant's slice size's
//                                    real vcg-* plan), tagged `acre-managed`, booting
//                                    a cloud-init that installs Ollama + pulls a model
//   vpc      POST /v2/vpcs + attach → a private network, attached to the instance
//   bucket   (synthetic)           → per-tenant object storage is a paid subscription,
//                                    not a cheap per-tenant call; kept simulated (documented)
//   endpoint poll instance + Ollama → wait until the VM is active and the model is loaded
//   live     endpointUrl = the instance's own Ollama (http://<ip>:11434/v1)
//
// Design notes (see PR / the J1 critique this was built against):
//  - The instance UUID is written into the store the instant POST returns, BEFORE any
//    further step, so a mid-flight failure or restart never loses track of a paid VM.
//  - Any failure AFTER the instance exists best-effort tears the instance+VPC down, so
//    a negative-balance account never leaks a billing GPU.
//  - teardown re-reads the instance and REFUSES to delete anything not carrying our tag
//    — the Vultr account is shared with unrelated projects.
//  - reapOrphans() is the safety net: delete any `acre-managed` instance the store no
//    longer knows about (the store is in-memory and resets on restart).
//  - Everything I/O is injectable (fetchFn, sleep, now) so tests never hit the live API.

import {
  GPU_SLICE_REGIONS,
  regionByCode,
  regionHasGpuSlice,
  sliceOption,
} from "@/lib/domain/catalog";
import {
  applyProvisionStep,
  failProvisioning,
  resetForRetry,
} from "@/lib/domain/provisioning";
import type { Tenant } from "@/lib/domain/types";
import type { TenantRepository } from "@/lib/store/tenant-repository";
import { encodeUserData, ollamaCloudInit } from "./cloud-init";
import type { Provisioner } from "./types";
import {
  instanceHasTag,
  VultrApi,
  VultrApiError,
  type FetchLike,
} from "./vultr-api";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A Vultr resource id (vs. a synthetic factory placeholder). */
function isRealResourceId(id: string): boolean {
  return UUID_RE.test(id);
}

/** Parse a numeric option/env, falling back if it's absent or not a finite number. */
function numOr(value: number | string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Is the pulled model actually present in Ollama's /api/tags listing? */
function modelIsLoaded(names: (string | undefined)[], model: string): boolean {
  const base = model.split(":")[0];
  return names.some(
    (n) => n === model || n === `${model}:latest` || n?.split(":")[0] === base,
  );
}

export interface VultrProvisionerOptions {
  fetchFn?: FetchLike;
  baseUrl?: string;
  /** Awaited between polls; inject an instant resolver in tests. */
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Management tag; teardown refuses anything without it. */
  tag?: string;
  osId?: number;
  ollamaModel?: string;
  firewallGroupId?: string;
  pollIntervalMs?: number;
  endpointTimeoutMs?: number;
  /** How long teardown waits for an instance to actually disappear. */
  deleteTimeoutMs?: number;
  /** Allow provisioning a public, unauthenticated endpoint with no firewall group. */
  allowOpenEndpoint?: boolean;
}

export class VultrProvisioner implements Provisioner {
  private readonly api: VultrApi;
  /** Used to probe the tenant instance's Ollama directly (not a Vultr API call). */
  private readonly fetchFn: FetchLike;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly tag: string;
  private readonly osId: number;
  private readonly ollamaModel: string;
  private readonly firewallGroupId?: string;
  private readonly pollIntervalMs: number;
  private readonly endpointTimeoutMs: number;
  private readonly deleteTimeoutMs: number;
  private readonly allowOpenEndpoint: boolean;
  /** Tenants with an orchestration in flight — guards against double-provision. */
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly repo: TenantRepository,
    apiKey: string,
    opts: VultrProvisionerOptions = {},
  ) {
    this.api = new VultrApi(apiKey, {
      fetchFn: opts.fetchFn,
      baseUrl: opts.baseUrl,
    });
    this.fetchFn = opts.fetchFn ?? ((url, init) => fetch(url, init));
    this.sleep =
      opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.now = opts.now ?? (() => Date.now());
    this.tag = opts.tag ?? process.env.ACRE_VULTR_TAG ?? "acre-managed";
    this.osId = numOr(opts.osId ?? process.env.ACRE_VULTR_OS_ID, 2284);
    this.ollamaModel =
      opts.ollamaModel ??
      process.env.ACRE_VULTR_OLLAMA_MODEL ??
      "llama3.2:1b";
    this.firewallGroupId =
      opts.firewallGroupId ?? process.env.ACRE_VULTR_FIREWALL_GROUP;
    // Floor the interval so a misconfigured 0 can't spin the poll loops.
    this.pollIntervalMs = Math.max(
      250,
      numOr(opts.pollIntervalMs ?? process.env.ACRE_VULTR_POLL_MS, 5000),
    );
    this.endpointTimeoutMs = numOr(
      opts.endpointTimeoutMs ?? process.env.ACRE_VULTR_ENDPOINT_TIMEOUT_MS,
      15 * 60 * 1000,
    );
    this.deleteTimeoutMs = numOr(
      opts.deleteTimeoutMs ?? process.env.ACRE_VULTR_DELETE_TIMEOUT_MS,
      2 * 60 * 1000,
    );
    this.allowOpenEndpoint =
      opts.allowOpenEndpoint ??
      process.env.ACRE_VULTR_ALLOW_OPEN_ENDPOINT === "1";
  }

  // The Provisioner port is fire-and-forget (void). The *Async variants are the
  // test seam — tests await them; the port methods kick them off detached.
  provision(tenantId: string): void {
    void this.provisionAsync(tenantId);
  }
  retry(tenantId: string, regionCode?: string): void {
    void this.retryAsync(tenantId, regionCode);
  }
  teardown(tenantId: string): void {
    void this.teardownAsync(tenantId);
  }

  async provisionAsync(tenantId: string): Promise<void> {
    const start = this.repo.get(tenantId);
    if (!start) return;

    // Guard against a second concurrent orchestration for the same tenant (a
    // double-submit or a retry fired mid-provision) — otherwise two real GPU
    // instances get created and the first is orphaned, billing, and untracked.
    if (this.inFlight.has(tenantId)) {
      console.warn(`[acre] provision already in flight for ${tenantId}; ignoring.`);
      return;
    }

    // Fail cleanly if the region can't carry the slice — nothing is created.
    if (!regionHasGpuSlice(start.regionCode)) {
      this.repo.save(
        failProvisioning(
          start,
          "slice",
          `No A16 slices in ${start.region}. Available in: ${GPU_SLICE_REGIONS.join(", ")}.`,
        ),
      );
      return;
    }

    // Secure default: refuse to stand up a public, keyless GPU (Ollama binds
    // 0.0.0.0:11434). Require a firewall group, or an explicit opt-in for a
    // throwaway demo. Nothing is created on this path.
    if (!this.firewallGroupId && !this.allowOpenEndpoint) {
      this.repo.save(
        failProvisioning(
          start,
          "slice",
          "Refusing to provision an unauthenticated public GPU endpoint. Set ACRE_VULTR_FIREWALL_GROUP to fence port 11434, or ACRE_VULTR_ALLOW_OPEN_ENDPOINT=1 to allow it (demo only).",
        ),
      );
      return;
    }

    this.inFlight.add(tenantId);
    let instanceId: string | undefined;
    let vpcId: string | undefined;

    try {
      // ---- slice: create the real fractional-GPU instance --------------------
      this.setStep(tenantId, "slice");
      const plan = sliceOption(start.sliceSize).plan;
      let instance;
      try {
        instance = await this.api.createInstance({
          region: start.regionCode,
          plan,
          osId: this.osId,
          label: `acre-${start.id}`,
          tags: [this.tag],
          userData: encodeUserData(ollamaCloudInit(this.ollamaModel)),
          firewallGroupId: this.firewallGroupId,
        });
      } catch (err) {
        if (err instanceof VultrApiError && err.isBilling) {
          this.failAt(
            tenantId,
            "slice",
            "Vultr rejected the instance create (account balance or permissions). Fund the account, then retry.",
          );
          return;
        }
        throw err;
      }
      instanceId = instance.id;
      // Record the paid resource id immediately, before anything else can fail.
      this.applyStep(tenantId, "slice", (t) => ({
        ...t,
        isolation: {
          ...t.isolation,
          gpuSlice: { id: instance.id, confirmed: false },
        },
      }));
      if (await this.abortedCleanup(tenantId, instanceId, vpcId)) return;

      // ---- vpc: create + attach a private network ----------------------------
      this.setStep(tenantId, "vpc");
      const vpc = await this.api.createVpc(start.regionCode, `acre-${start.id}`);
      vpcId = vpc.id;
      await this.api.attachVpc(instance.id, vpc.id);
      this.applyStep(tenantId, "vpc", (t) => ({
        ...t,
        isolation: {
          ...t.isolation,
          vpc: {
            id: vpc.id,
            cidr: `${vpc.v4_subnet}/${vpc.v4_subnet_mask}`,
            confirmed: false,
          },
        },
      }));
      if (await this.abortedCleanup(tenantId, instanceId, vpcId)) return;

      // ---- bucket: kept synthetic (documented) -------------------------------
      this.setStep(tenantId, "bucket");
      this.applyStep(tenantId, "bucket");

      // ---- endpoint: wait for the VM, then for the model to load -------------
      this.setStep(tenantId, "endpoint");
      const ip = await this.waitForInstanceIp(instance.id);
      if (await this.abortedCleanup(tenantId, instanceId, vpcId)) return;
      await this.waitForOllama(ip);
      if (await this.abortedCleanup(tenantId, instanceId, vpcId)) return;
      this.applyStep(tenantId, "endpoint");

      // ---- live: point the endpoint at the instance's own Ollama -------------
      // applyProvisionStep("live") sets the mock's placeholder URL, so override it
      // with the instance's real endpoint afterwards.
      this.applyStep(tenantId, "live");
      const live = this.repo.get(tenantId);
      if (live) {
        this.repo.save({ ...live, endpointUrl: `http://${ip}:11434/v1` });
      }
    } catch (err) {
      // Anything unexpected after the instance exists: don't leak a paid GPU.
      const step = this.repo.get(tenantId)?.currentStep ?? "endpoint";
      console.error(`[acre] provisioning ${tenantId} failed at ${step}:`, err);
      await this.cleanupResources(instanceId, vpcId);
      this.failAt(
        tenantId,
        step,
        err instanceof Error ? err.message : "Provisioning failed.",
      );
    } finally {
      this.inFlight.delete(tenantId);
    }
  }

  async retryAsync(tenantId: string, regionCode?: string): Promise<void> {
    const tenant = this.repo.get(tenantId);
    if (!tenant) return;
    // Don't reset a tenant whose provision is still running (that would strand the
    // in-flight run's resources); let the in-flight one finish or be torn down first.
    if (this.inFlight.has(tenantId)) {
      console.warn(`[acre] retry ignored for ${tenantId}: provision in flight.`);
      return;
    }
    // Old resources were auto-torn-down at failure; start clean.
    const newRegion = regionCode ? regionByCode(regionCode) : undefined;
    this.repo.save(resetForRetry(tenant, newRegion));
    await this.provisionAsync(tenantId);
  }

  async teardownAsync(tenantId: string): Promise<void> {
    const tenant = this.repo.get(tenantId);
    if (!tenant || tenant.status === "stopped") return;

    const instanceId = tenant.isolation.gpuSlice.id;
    const vpcId = tenant.isolation.vpc.id;

    // Guard BEFORE we mutate anything: never delete an instance that isn't ours.
    if (isRealResourceId(instanceId)) {
      const safe = await this.safeToDelete(instanceId);
      if (!safe) {
        console.error(
          `[acre] REFUSING to tear down ${tenantId}: instance ${instanceId} is not tagged "${this.tag}".`,
        );
        return;
      }
    }

    this.repo.save({ ...tenant, status: "tearing_down", currentStep: null });
    await this.cleanupResources(
      isRealResourceId(instanceId) ? instanceId : undefined,
      isRealResourceId(vpcId) ? vpcId : undefined,
    );

    const current = this.repo.get(tenantId);
    if (!current) return;
    this.repo.save({
      ...current,
      status: "stopped",
      endpointUrl: null,
      billingStoppedAt: this.now(),
    });
  }

  /**
   * Delete every `acre-managed` instance whose id is NOT in `keep`. The store is
   * in-memory and resets on restart, so this reconciles reality against what the
   * app still knows about — the backstop against orphaned, billing GPUs.
   * Returns the ids it reaped.
   */
  async reapOrphans(keep: Set<string>): Promise<string[]> {
    const managed = await this.api.listInstancesByTag(this.tag);
    const reaped: string[] = [];
    for (const instance of managed) {
      if (keep.has(instance.id)) continue;
      if (!instanceHasTag(instance, this.tag)) continue; // defensive
      await this.api.deleteInstance(instance.id);
      reaped.push(instance.id);
    }
    return reaped;
  }

  // ---- internals -----------------------------------------------------------

  /** True if the instance exists AND carries our tag; 404 (already gone) is safe. */
  private async safeToDelete(instanceId: string): Promise<boolean> {
    try {
      const instance = await this.api.getInstance(instanceId);
      return instanceHasTag(instance, this.tag);
    } catch (err) {
      if (err instanceof VultrApiError && err.status === 404) return true;
      throw err;
    }
  }

  /** Best-effort delete instance (then VPC). Guarded; swallows errors so teardown never throws. */
  private async cleanupResources(
    instanceId?: string,
    vpcId?: string,
  ): Promise<void> {
    if (instanceId) {
      try {
        if (await this.safeToDelete(instanceId)) {
          await this.api.deleteInstance(instanceId);
          await this.waitForInstanceGone(instanceId);
        }
      } catch (err) {
        console.error(`[acre] failed to delete instance ${instanceId}:`, err);
      }
    }
    if (vpcId) {
      // The VPC can't be deleted while still attached, so this runs after the
      // instance is gone.
      try {
        await this.api.deleteVpc(vpcId);
      } catch (err) {
        console.error(`[acre] failed to delete vpc ${vpcId}:`, err);
      }
    }
  }

  private async waitForInstanceIp(instanceId: string): Promise<string> {
    const deadline = this.now() + this.endpointTimeoutMs;
    while (this.now() < deadline) {
      try {
        const instance = await this.api.getInstance(instanceId);
        const ready =
          instance.status === "active" &&
          instance.main_ip &&
          instance.main_ip !== "0.0.0.0";
        if (ready) return instance.main_ip;
      } catch {
        // Transient API error (rate limit, blip) during a multi-minute boot —
        // keep polling rather than aborting and deleting the fresh instance.
      }
      await this.sleep(this.pollIntervalMs);
    }
    throw new Error("Instance did not become active in time.");
  }

  private async waitForOllama(ip: string): Promise<void> {
    const deadline = this.now() + this.endpointTimeoutMs;
    while (this.now() < deadline) {
      try {
        const res = await this.fetchFn(`http://${ip}:11434/api/tags`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          // Ollama serves /api/tags seconds after boot, but the model pull takes
          // minutes — only "live" once the model is actually present, or the first
          // inference calls hit a box without the model.
          const data = (await res.json().catch(() => null)) as {
            models?: { name?: string }[];
          } | null;
          const names = (data?.models ?? []).map((m) => m.name);
          if (modelIsLoaded(names, this.ollamaModel)) return;
        }
      } catch {
        // cloud-init not finished yet — keep polling
      }
      await this.sleep(this.pollIntervalMs);
    }
    throw new Error("Endpoint did not load the model in time.");
  }

  private async waitForInstanceGone(instanceId: string): Promise<void> {
    const deadline = this.now() + this.deleteTimeoutMs;
    while (this.now() < deadline) {
      try {
        await this.api.getInstance(instanceId);
      } catch (err) {
        if (err instanceof VultrApiError && err.status === 404) return;
        throw err;
      }
      await this.sleep(this.pollIntervalMs);
    }
  }

  /** If the tenant was torn down mid-provision, clean up and report aborted. */
  private async abortedCleanup(
    tenantId: string,
    instanceId?: string,
    vpcId?: string,
  ): Promise<boolean> {
    const t = this.repo.get(tenantId);
    if (!t || t.status === "tearing_down" || t.status === "stopped") {
      await this.cleanupResources(instanceId, vpcId);
      return true;
    }
    return false;
  }

  private setStep(tenantId: string, step: Tenant["currentStep"]): void {
    const t = this.repo.get(tenantId);
    if (t) this.repo.save({ ...t, currentStep: step });
  }

  private applyStep(
    tenantId: string,
    step: "slice" | "vpc" | "bucket" | "endpoint" | "live",
    patch?: (t: Tenant) => Tenant,
  ): void {
    const t = this.repo.get(tenantId);
    if (!t) return;
    const patched = patch ? patch(t) : t;
    this.repo.save(applyProvisionStep(patched, step, this.now()));
  }

  private failAt(
    tenantId: string,
    step: "slice" | "vpc" | "bucket" | "endpoint" | "live",
    message: string,
  ): void {
    const t = this.repo.get(tenantId);
    if (!t) return;
    // A concurrent teardown may have already stopped this tenant; don't resurrect
    // it as "failed".
    if (t.status === "stopped" || t.status === "tearing_down") return;
    this.repo.save(failProvisioning(t, step, message));
  }
}
