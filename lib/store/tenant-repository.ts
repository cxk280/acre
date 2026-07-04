// In-memory tenant store behind a small interface. This is deliberately the ONE
// place persistence lives, so swapping to Postgres later is a single new class
// implementing TenantRepository — no caller changes.
//
// Demo caveat: state is process-local and resets on restart, and it assumes a
// single server instance (module singleton). Fine for the elastic, torn-down-
// after demo; noted in the PR.

import { createTenant } from "@/lib/domain/tenant-factory";
import type { CreateTenantInput, Tenant } from "@/lib/domain/types";

export interface TenantRepository {
  list(): Tenant[];
  get(id: string): Tenant | undefined;
  create(input: CreateTenantInput): Tenant;
  /** Replace a tenant wholesale (used by the provisioner state machine). */
  save(tenant: Tenant): void;
  /** Shallow-merge a partial patch; returns the updated tenant or undefined. */
  update(id: string, patch: Partial<Tenant>): Tenant | undefined;
  remove(id: string): boolean;
}

class InMemoryTenantRepository implements TenantRepository {
  private tenants = new Map<string, Tenant>();
  private seq = 0;

  list(): Tenant[] {
    return [...this.tenants.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  get(id: string): Tenant | undefined {
    return this.tenants.get(id);
  }

  create(input: CreateTenantInput): Tenant {
    const tenant = createTenant(input, this.seq++, Date.now());
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  save(tenant: Tenant): void {
    this.tenants.set(tenant.id, tenant);
  }

  update(id: string, patch: Partial<Tenant>): Tenant | undefined {
    const existing = this.tenants.get(id);
    if (!existing) return undefined;
    const next = { ...existing, ...patch };
    this.tenants.set(id, next);
    return next;
  }

  remove(id: string): boolean {
    return this.tenants.delete(id);
  }
}

// Persist the singleton across Next.js dev HMR reloads via globalThis.
const globalStore = globalThis as unknown as {
  __acreTenantRepository?: TenantRepository;
};

export const tenantRepository: TenantRepository =
  globalStore.__acreTenantRepository ??
  (globalStore.__acreTenantRepository = new InMemoryTenantRepository());

/** For tests: a fresh, isolated repository instance. */
export function createInMemoryTenantRepository(): TenantRepository {
  return new InMemoryTenantRepository();
}
