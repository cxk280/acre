// Core domain types for Acre tenants.
//
// A "tenant" is a small organization that gets its own dedicated, isolated
// fractional-GPU inference endpoint: a private GPU slice, a private VPC, and a
// private Object Storage bucket, provisioned in the tenant's own region.

export type TenantStatus =
  | "provisioning"
  | "running"
  | "idle"
  | "tearing_down"
  | "stopped"
  | "failed";

export interface FailureInfo {
  /** The provisioning step that failed. */
  step: ProvisionStepKey;
  message: string;
}

/** Fractional slices of a Vultr A16 GPU. The whole story: rent a fraction. */
export type SliceSize = "a16-1_8" | "a16-1_4" | "a16-1_2";

/** The three resources whose per-tenant isolation the badge proves. */
export type ProvisionStepKey = "slice" | "vpc" | "bucket" | "endpoint" | "live";

export interface IsolationResource {
  /** Concrete resource identifier — proof this is real, not a shared queue. */
  id: string;
  confirmed: boolean;
}

export interface Isolation {
  gpuSlice: IsolationResource;
  vpc: IsolationResource & { cidr: string };
  bucket: IsolationResource;
}

export interface Tenant {
  id: string;
  name: string;
  /** Human region label, e.g. "New Jersey". */
  region: string;
  /** Vultr region code, e.g. "ewr". */
  regionCode: string;
  sliceSize: SliceSize;
  model: string;
  status: TenantStatus;
  isolation: Isolation;
  /** Private inference endpoint URL — set once the endpoint is live. */
  endpointUrl: string | null;
  /** Live $/hr — always below the $0.50 ceiling by construction. */
  ratePerHour: number;
  /** epoch ms when the tenant was created (provisioning began). */
  createdAt: number;
  /** epoch ms when the endpoint went live, or null while provisioning. */
  provisionedAt: number | null;
  /** epoch ms when billing started (slice reserved). null before that. */
  billingStartedAt: number | null;
  /** epoch ms when billing stopped (torn down). null while still billable. */
  billingStoppedAt: number | null;
  /** The provisioning step currently in flight, or null when settled. */
  currentStep: ProvisionStepKey | null;
  completedSteps: ProvisionStepKey[];
  /** Set when provisioning failed (e.g. region at capacity); null otherwise. */
  failure: FailureInfo | null;
}

export interface CreateTenantInput {
  name: string;
  regionCode: string;
  sliceSize: SliceSize;
  model: string;
}
