// MockProvisioner — simulates the ~60s provisioning theater on a timer, updating
// the store step by step so the UI (polling the tenant) sees the isolation badge
// build and the cost meter start ticking. The schedule + step durations are
// injectable so tests can drive it synchronously with an immediate scheduler.

import {
  PROVISION_STEP_ORDER,
  applyProvisionStep,
} from "@/lib/domain/provisioning";
import type { ProvisionStepKey } from "@/lib/domain/types";
import type { TenantRepository } from "@/lib/store/tenant-repository";
import type { Provisioner } from "./types";

type ScheduleFn = (fn: () => void, ms: number) => void;

const DEFAULT_STEP_MS: Record<ProvisionStepKey, number> = {
  slice: 1100,
  vpc: 1100,
  bucket: 1100,
  endpoint: 2400,
  live: 300,
};

const DEFAULT_TEARDOWN_MS = 900;

export interface MockProvisionerOptions {
  stepMs?: Partial<Record<ProvisionStepKey, number>>;
  teardownMs?: number;
  /** Defaults to setTimeout; pass an immediate scheduler in tests. */
  schedule?: ScheduleFn;
  now?: () => number;
}

export class MockProvisioner implements Provisioner {
  private readonly stepMs: Record<ProvisionStepKey, number>;
  private readonly teardownMs: number;
  private readonly schedule: ScheduleFn;
  private readonly now: () => number;

  constructor(
    private readonly repo: TenantRepository,
    opts: MockProvisionerOptions = {},
  ) {
    this.stepMs = { ...DEFAULT_STEP_MS, ...opts.stepMs };
    this.teardownMs = opts.teardownMs ?? DEFAULT_TEARDOWN_MS;
    this.schedule = opts.schedule ?? ((fn, ms) => void setTimeout(fn, ms));
    this.now = opts.now ?? (() => Date.now());
  }

  provision(tenantId: string): void {
    this.runStep(tenantId, 0);
  }

  private runStep(tenantId: string, index: number): void {
    const tenant = this.repo.get(tenantId);
    if (!tenant || this.isAborted(tenant.status)) return;

    const step = PROVISION_STEP_ORDER[index];
    // Show the step as in-flight, then apply its effect after the delay.
    this.repo.save({ ...tenant, currentStep: step });

    this.schedule(() => {
      const current = this.repo.get(tenantId);
      if (!current || this.isAborted(current.status)) return;
      this.repo.save(applyProvisionStep(current, step, this.now()));
      if (index + 1 < PROVISION_STEP_ORDER.length) {
        this.runStep(tenantId, index + 1);
      }
    }, this.stepMs[step]);
  }

  teardown(tenantId: string): void {
    const tenant = this.repo.get(tenantId);
    if (!tenant || tenant.status === "stopped") return;

    this.repo.save({ ...tenant, status: "tearing_down", currentStep: null });
    this.schedule(() => {
      const current = this.repo.get(tenantId);
      if (!current) return;
      this.repo.save({
        ...current,
        status: "stopped",
        endpointUrl: null,
        billingStoppedAt: this.now(),
      });
    }, this.teardownMs);
  }

  private isAborted(status: string): boolean {
    return status === "tearing_down" || status === "stopped";
  }
}
