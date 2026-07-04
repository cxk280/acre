// VultrProvisioner — the swappable real adapter. This is where per-tenant Vultr
// API calls will live: reserve a fractional-GPU instance, create a private VPC,
// create a private Object Storage bucket, boot the inference endpoint.
//
// It is a deliberate stub for now: not wired unless ACRE_PROVISIONER=vultr, and
// it never hardcodes credentials — the API key is injected from the environment
// by the factory in ./index.ts.

import type { TenantRepository } from "@/lib/store/tenant-repository";
import type { Provisioner } from "./types";

export class VultrProvisioner implements Provisioner {
  constructor(
    private readonly repo: TenantRepository,
    private readonly apiKey: string,
  ) {}

  provision(): void {
    throw new Error(
      "VultrProvisioner is a stub: real Vultr API provisioning is not wired yet. " +
        "Unset ACRE_PROVISIONER to use the mock provisioner.",
    );
  }

  teardown(): void {
    throw new Error(
      "VultrProvisioner is a stub: real Vultr API teardown is not wired yet.",
    );
  }
}
