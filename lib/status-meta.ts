// Presentation metadata per tenant status. Class strings are written as full
// literals so Tailwind's scanner generates them.

import type { TenantStatus } from "@/lib/domain/types";

export interface StatusMeta {
  label: string;
  /** pill background */
  bg: string;
  /** pill text + dot color */
  fg: string;
  dot: string;
  /** whether the dot should pulse (in-flight states) */
  pulse: boolean;
}

export const STATUS_META: Record<TenantStatus, StatusMeta> = {
  provisioning: {
    label: "Provisioning",
    bg: "bg-prov-bg",
    fg: "text-prov",
    dot: "bg-prov",
    pulse: true,
  },
  running: {
    label: "Running",
    bg: "bg-run-bg",
    fg: "text-run",
    dot: "bg-run",
    pulse: false,
  },
  idle: {
    label: "Idle",
    bg: "bg-idle-bg",
    fg: "text-idle",
    dot: "bg-idle",
    pulse: false,
  },
  tearing_down: {
    label: "Tearing down",
    bg: "bg-tear-bg",
    fg: "text-tear",
    dot: "bg-tear",
    pulse: true,
  },
  stopped: {
    label: "Stopped",
    bg: "bg-stop-bg",
    fg: "text-stop",
    dot: "bg-stop",
    pulse: false,
  },
  failed: {
    label: "Failed",
    bg: "bg-danger-bg",
    fg: "text-over",
    dot: "bg-over",
    pulse: false,
  },
};
