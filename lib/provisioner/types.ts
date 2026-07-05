// The provisioning port. A Provisioner drives a tenant from "provisioning" to a
// live, isolated endpoint and tears it back down. The mock simulates it on a
// timer; the Vultr adapter (stub) is where the real API calls will land.

export interface Provisioner {
  /** Begin provisioning an existing tenant (kicks off the async progression). */
  provision(tenantId: string): void;
  /** Retry a failed tenant, optionally in a new region. */
  retry(tenantId: string, regionCode?: string): void;
  /** Release the tenant's resources; billing stops. */
  teardown(tenantId: string): void;
}
