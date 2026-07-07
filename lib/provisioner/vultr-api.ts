// A thin, typed wrapper over the slice of the Vultr v2 REST API the provisioner
// uses. Every network call funnels through `request()` so auth, timeouts, and
// error shaping live in one place. `fetchFn` is injectable so tests drive a fake
// and never hit the live API (and never spend money).
//
// Docs: https://www.vultr.com/api/  (instances, vpcs).

export type FetchLike = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

/** A Vultr API error carrying the HTTP status so callers can branch on it. */
export class VultrApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "VultrApiError";
  }

  /** Billing/permission failures — e.g. a negative-balance account can't create. */
  get isBilling(): boolean {
    return this.status === 402 || this.status === 403;
  }
}

export interface VultrInstance {
  id: string;
  status: string; // "pending" | "active" | ...
  power_status?: string;
  server_status?: string; // "none" | "locked" | "installingbooting" | "ok"
  main_ip: string; // "0.0.0.0" until assigned
  region: string;
  plan: string;
  tags?: string[];
  tag?: string; // legacy single-tag field
}

export interface VultrVpc {
  id: string;
  region: string;
  v4_subnet: string;
  v4_subnet_mask: number;
  description?: string;
}

export interface CreateInstanceParams {
  region: string;
  plan: string;
  osId: number;
  label: string;
  tags: string[];
  userData: string; // base64
  firewallGroupId?: string;
}

const DEFAULT_BASE_URL = "https://api.vultr.com/v2";
const DEFAULT_TIMEOUT_MS = 30_000;

export class VultrApi {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchLike;
  private readonly timeoutMs: number;

  constructor(
    private readonly apiKey: string,
    opts: { fetchFn?: FetchLike; baseUrl?: string; timeoutMs?: number } = {},
  ) {
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
    // Default to global fetch; tests inject a fake.
    this.fetchFn = opts.fetchFn ?? ((url, init) => fetch(url, init));
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new VultrApiError(
        res.status,
        `Vultr ${method} ${path} → ${res.status}. ${detail.slice(0, 300)}`,
      );
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async createInstance(params: CreateInstanceParams): Promise<VultrInstance> {
    const { instance } = await this.request<{ instance: VultrInstance }>(
      "POST",
      "/instances",
      {
        region: params.region,
        plan: params.plan,
        os_id: params.osId,
        label: params.label,
        tags: params.tags,
        user_data: params.userData,
        ...(params.firewallGroupId
          ? { firewall_group_id: params.firewallGroupId }
          : {}),
      },
    );
    return instance;
  }

  async getInstance(id: string): Promise<VultrInstance> {
    const { instance } = await this.request<{ instance: VultrInstance }>(
      "GET",
      `/instances/${id}`,
    );
    return instance;
  }

  /** All instances carrying `tag` — the basis for orphan reconciliation. */
  async listInstancesByTag(tag: string): Promise<VultrInstance[]> {
    const { instances } = await this.request<{ instances: VultrInstance[] }>(
      "GET",
      `/instances?tag=${encodeURIComponent(tag)}&per_page=500`,
    );
    return instances ?? [];
  }

  async deleteInstance(id: string): Promise<void> {
    await this.request<void>("DELETE", `/instances/${id}`);
  }

  async createVpc(region: string, description: string): Promise<VultrVpc> {
    const { vpc } = await this.request<{ vpc: VultrVpc }>("POST", "/vpcs", {
      region,
      description,
    });
    return vpc;
  }

  async attachVpc(instanceId: string, vpcId: string): Promise<void> {
    await this.request<void>("POST", `/instances/${instanceId}/vpcs/attach`, {
      vpc_id: vpcId,
    });
  }

  async deleteVpc(id: string): Promise<void> {
    await this.request<void>("DELETE", `/vpcs/${id}`);
  }
}

/** Does this instance carry the given management tag (checks both API shapes)? */
export function instanceHasTag(instance: VultrInstance, tag: string): boolean {
  if (Array.isArray(instance.tags) && instance.tags.includes(tag)) return true;
  return instance.tag === tag;
}
