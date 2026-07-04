import { cn } from "@/lib/cn";
import type { TenantStatus } from "@/lib/domain/types";
import { STATUS_META } from "@/lib/status-meta";

export function StatusPill({ status }: { status: TenantStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[13px] font-medium",
        meta.bg,
        meta.fg,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          meta.dot,
          meta.pulse && "animate-pulse",
        )}
      />
      {meta.label}
    </span>
  );
}
