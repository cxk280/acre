// The provisioning "theater": the ordered steps that turn a request into a live,
// isolated endpoint, plus the pure state transition each step applies. Keeping
// the transition pure (a Tenant in, a Tenant out) lets both the mock provisioner
// and tests drive it deterministically.

import type { Region } from "./catalog";
import type { ProvisionStepKey, Tenant } from "./types";

export interface ProvisionStep {
  key: ProvisionStepKey;
  /** Label once the step has completed. */
  doneLabel: string;
  /** Label while the step is in flight. */
  activeLabel: string;
  /** Concrete detail line (resource id, model, url) derived from the tenant. */
  detail: (t: Tenant) => string;
}

export const PROVISION_STEPS: ProvisionStep[] = [
  {
    key: "slice",
    doneLabel: "Reserved fractional GPU slice",
    activeLabel: "Reserving fractional GPU slice",
    detail: (t) => t.isolation.gpuSlice.id,
  },
  {
    key: "vpc",
    doneLabel: "Created private VPC",
    activeLabel: "Creating private VPC",
    detail: (t) => `${t.isolation.vpc.id} · ${t.isolation.vpc.cidr}`,
  },
  {
    key: "bucket",
    doneLabel: "Created private Object Storage bucket",
    activeLabel: "Creating private Object Storage bucket",
    detail: (t) => t.isolation.bucket.id,
  },
  {
    key: "endpoint",
    doneLabel: "Booted endpoint · loaded model",
    activeLabel: "Booting endpoint · loading model",
    detail: (t) => `Loading ${t.model}…`,
  },
  {
    key: "live",
    doneLabel: "Endpoint live",
    activeLabel: "Finalizing",
    detail: (t) => t.endpointUrl ?? "Private URL appears here",
  },
];

export const PROVISION_STEP_ORDER: ProvisionStepKey[] = PROVISION_STEPS.map(
  (s) => s.key,
);

export function endpointUrlFor(tenantId: string): string {
  return `https://${tenantId}.acre.io/v1`;
}

/** Mark provisioning as failed at a step — nothing was reserved or charged. */
export function failProvisioning(
  tenant: Tenant,
  step: ProvisionStepKey,
  message: string,
): Tenant {
  return {
    ...tenant,
    status: "failed",
    currentStep: null,
    failure: { step, message },
  };
}

/**
 * Reset a tenant back to a clean "provisioning" state for a retry, optionally in
 * a new region. Since a failure at the slice step reserved nothing, this clears
 * all isolation/billing state so the retry starts fresh.
 */
export function resetForRetry(tenant: Tenant, newRegion?: Region): Tenant {
  return {
    ...tenant,
    region: newRegion?.label ?? tenant.region,
    regionCode: newRegion?.code ?? tenant.regionCode,
    status: "provisioning",
    failure: null,
    currentStep: null,
    completedSteps: [],
    endpointUrl: null,
    provisionedAt: null,
    billingStartedAt: null,
    billingStoppedAt: null,
    isolation: {
      gpuSlice: { ...tenant.isolation.gpuSlice, confirmed: false },
      vpc: { ...tenant.isolation.vpc, confirmed: false },
      bucket: { ...tenant.isolation.bucket, confirmed: false },
    },
  };
}

/**
 * Apply the completion effect of one provisioning step, returning a new tenant.
 * Pure — no timers, no I/O. The instant the slice is reserved, billing starts;
 * once the endpoint is live, the tenant is running with a private URL.
 */
export function applyProvisionStep(
  tenant: Tenant,
  step: ProvisionStepKey,
  nowMs: number,
): Tenant {
  const completedSteps = tenant.completedSteps.includes(step)
    ? tenant.completedSteps
    : [...tenant.completedSteps, step];
  const base = { ...tenant, completedSteps };

  switch (step) {
    case "slice":
      return {
        ...base,
        isolation: {
          ...base.isolation,
          gpuSlice: { ...base.isolation.gpuSlice, confirmed: true },
        },
        billingStartedAt: base.billingStartedAt ?? nowMs,
      };
    case "vpc":
      return {
        ...base,
        isolation: {
          ...base.isolation,
          vpc: { ...base.isolation.vpc, confirmed: true },
        },
      };
    case "bucket":
      return {
        ...base,
        isolation: {
          ...base.isolation,
          bucket: { ...base.isolation.bucket, confirmed: true },
        },
      };
    case "endpoint":
      return base;
    case "live":
      return {
        ...base,
        status: "running",
        endpointUrl: endpointUrlFor(base.id),
        provisionedAt: nowMs,
        currentStep: null,
      };
  }
}
