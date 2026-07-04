// Composition root for provisioning: pick the adapter from the environment and
// expose a single process-wide instance. Defaults to the mock; the real Vultr
// adapter is opt-in and requires a key that only ever comes from the env.

import { tenantRepository } from "@/lib/store/tenant-repository";
import { MockProvisioner } from "./mock";
import type { Provisioner } from "./types";
import { VultrProvisioner } from "./vultr";

function buildProvisioner(): Provisioner {
  if (process.env.ACRE_PROVISIONER === "vultr") {
    const apiKey = process.env.VULTR_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ACRE_PROVISIONER=vultr requires VULTR_API_KEY to be set.",
      );
    }
    return new VultrProvisioner(tenantRepository, apiKey);
  }
  return new MockProvisioner(tenantRepository);
}

// Persist across dev HMR reloads so in-flight provisioning timers survive.
const globalProvisioner = globalThis as unknown as {
  __acreProvisioner?: Provisioner;
};

export const provisioner: Provisioner =
  globalProvisioner.__acreProvisioner ??
  (globalProvisioner.__acreProvisioner = buildProvisioner());

export type { Provisioner } from "./types";
