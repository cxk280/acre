// Builds a fresh Tenant in the "provisioning" state, allocating unique isolation
// resource identifiers from a monotonic sequence number so that no two tenants
// ever share a GPU slice, VPC, or bucket (asserted in tests/isolation.test.ts).

import { regionByCode, sliceOption } from "./catalog";
import { ratePerHour } from "./rates";
import type { CreateTenantInput, Tenant } from "./types";

export function createTenant(
  input: CreateTenantInput,
  seq: number,
  nowMs: number,
): Tenant {
  const region = regionByCode(input.regionCode);
  if (!region) throw new Error(`Unknown region: ${input.regionCode}`);
  const slice = sliceOption(input.sliceSize);

  const num = 4471 + seq;
  const id = `tnt-${num}`;
  const vpcHex = (0x8f2a + seq * 0x409).toString(16).slice(-4);
  const gpuLetter = String.fromCharCode(97 + (seq % 26));

  return {
    id,
    name: input.name.trim(),
    region: region.label,
    regionCode: region.code,
    sliceSize: input.sliceSize,
    model: input.model,
    status: "provisioning",
    isolation: {
      gpuSlice: {
        id: `${slice.migProfile} · gpu-${seq % 8}${gpuLetter}`,
        confirmed: false,
      },
      vpc: {
        id: `vpc-${vpcHex}`,
        cidr: `10.${20 + (seq % 200)}.0.0/24`,
        confirmed: false,
      },
      bucket: { id: `acre-${id}`, confirmed: false },
    },
    endpointUrl: null,
    ratePerHour: ratePerHour(input.sliceSize),
    createdAt: nowMs,
    provisionedAt: null,
    billingStartedAt: null,
    billingStoppedAt: null,
    currentStep: null,
    completedSteps: [],
  };
}
