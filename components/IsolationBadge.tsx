import { cn } from "@/lib/cn";
import type { Isolation } from "@/lib/domain/types";
import { Icon } from "./icons";

interface Segment {
  label: string;
  confirmed: boolean;
}

function segmentsFrom(isolation: Isolation): Segment[] {
  return [
    { label: "GPU slice", confirmed: isolation.gpuSlice.confirmed },
    { label: "Private VPC", confirmed: isolation.vpc.confirmed },
    { label: "Private bucket", confirmed: isolation.bucket.confirmed },
  ];
}

/** Compact three-segment badge — each segment flips teal once confirmed. */
export function IsolationBadgeCompact({
  isolation,
}: {
  isolation: Isolation;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {segmentsFrom(isolation).map((seg) => (
        <span
          key={seg.label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm px-2 py-[5px] text-xs font-medium",
            seg.confirmed
              ? "bg-iso-bg text-iso-strong"
              : "bg-subtle text-ink3",
          )}
        >
          <Icon
            name="shield-check"
            size={14}
            strokeWidth={2.2}
            className={seg.confirmed ? "text-iso" : "text-ink3"}
          />
          {seg.label}
        </span>
      ))}
    </div>
  );
}

/** Expanded badge — proves isolation with concrete resource identifiers. */
export function IsolationBadgeExpanded({
  isolation,
}: {
  isolation: Isolation;
}) {
  const rows = [
    {
      label: "Dedicated GPU slice",
      resource: isolation.gpuSlice.id,
      confirmed: isolation.gpuSlice.confirmed,
    },
    {
      label: "Private VPC",
      resource: `${isolation.vpc.id} · ${isolation.vpc.cidr}`,
      confirmed: isolation.vpc.confirmed,
    },
    {
      label: "Private Object Storage",
      resource: isolation.bucket.id,
      confirmed: isolation.bucket.confirmed,
    },
  ];

  return (
    <div className="flex flex-col">
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={cn(
            "flex items-center gap-3 py-3",
            i < rows.length - 1 && "border-b border-line-subtle",
          )}
        >
          <Icon
            name="shield-check"
            size={18}
            strokeWidth={2.2}
            className={row.confirmed ? "text-iso" : "text-ink3"}
          />
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-ink">
              {row.label}
            </span>
            <span className="font-mono text-xs text-ink2">{row.resource}</span>
          </div>
          <div className="ml-auto">
            {row.confirmed ? (
              <Icon
                name="check"
                size={16}
                strokeWidth={3}
                className="text-iso"
              />
            ) : (
              <span className="size-4 rounded-full border-2 border-line-strong" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
