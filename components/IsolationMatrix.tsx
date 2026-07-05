import type { ReactNode } from "react";
import { formatUsd } from "@/lib/format";
import type { Tenant } from "@/lib/domain/types";
import { Icon } from "./icons";
import { StatusPill } from "./StatusPill";

// The multi-tenant isolation proof: one row per tenant, each with its OWN GPU
// slice, VPC/CIDR, and bucket — no shared cells anywhere in the grid.
export function IsolationMatrix({ tenants }: { tenants: Tenant[] }) {
  const active = tenants.filter(
    (t) => t.status !== "stopped" && t.status !== "failed",
  );

  if (active.length === 0) {
    return (
      <p className="py-6 text-sm text-ink3">
        No active tenants — provision one to populate the matrix.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            <Th>Tenant</Th>
            <Th>Region</Th>
            <Th>GPU slice</Th>
            <Th>Private VPC</Th>
            <Th>Bucket</Th>
            <Th>$/hr</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {active.map((t) => (
            <tr key={t.id} className="border-b border-line-subtle last:border-0">
              <td className="py-3 pr-4 text-[13px] font-semibold text-ink">
                {t.name}
              </td>
              <td className="py-3 pr-4 text-[13px] text-ink2">
                {t.region.split(" · ")[0]}
              </td>
              <IsoCell
                id={t.isolation.gpuSlice.id}
                confirmed={t.isolation.gpuSlice.confirmed}
              />
              <IsoCell
                id={`${t.isolation.vpc.id} · ${t.isolation.vpc.cidr}`}
                confirmed={t.isolation.vpc.confirmed}
              />
              <IsoCell
                id={t.isolation.bucket.id}
                confirmed={t.isolation.bucket.confirmed}
              />
              <td className="py-3 pr-4 font-mono text-[13px] text-under">
                {formatUsd(t.ratePerHour)}
              </td>
              <td className="py-3">
                <StatusPill status={t.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="pb-3 pr-4 text-[11px] font-medium text-ink3">{children}</th>
  );
}

function IsoCell({ id, confirmed }: { id: string; confirmed: boolean }) {
  return (
    <td className="py-3 pr-4">
      <span className="flex items-center gap-1.5">
        {confirmed ? (
          <Icon name="check" size={13} strokeWidth={3} className="text-iso" />
        ) : (
          <span className="size-3 rounded-full border-2 border-line-strong" />
        )}
        <span className="font-mono text-[11px] text-ink2">{id}</span>
      </span>
    </td>
  );
}
