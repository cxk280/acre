"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Tenant } from "@/lib/domain/types";
import { STATUS_META } from "@/lib/status-meta";
import { buttonClass } from "./Button";
import { TeardownDialog } from "./ConfirmDialog";
import { CostMeterInline } from "./CostMeter";
import { IsolationBadgeCompact } from "./IsolationBadge";
import { StatusPill } from "./StatusPill";

export function TenantCard({
  tenant,
  onTearDown,
  tearingDown,
}: {
  tenant: Tenant;
  onTearDown?: (id: string) => void;
  tearingDown?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canTearDown =
    tenant.status !== "stopped" && tenant.status !== "tearing_down";

  return (
    <div className="flex flex-col gap-3.5 rounded-lg border border-line-subtle bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="flex flex-col">
          <span className="text-base font-semibold text-ink">{tenant.name}</span>
          <span className="text-xs text-ink3">{tenant.region}</span>
        </div>
        <div className="ml-auto">
          <StatusPill status={tenant.status} />
        </div>
      </div>

      <IsolationBadgeCompact isolation={tenant.isolation} />

      <CostMeterInline ratePerHour={tenant.ratePerHour} />

      <div className="flex items-center gap-2 border-t border-line-subtle pt-3.5">
        <span className="flex items-center gap-1.5">
          <span
            className={cn("size-[7px] rounded-full", STATUS_META[tenant.status].dot)}
          />
          <span className="text-xs font-medium text-ink2">{tenant.model}</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          {onTearDown && canTearDown && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={tearingDown}
              className={cn(buttonClass("danger"), "px-3 py-2")}
            >
              {tearingDown ? "Tearing down…" : "Tear down"}
            </button>
          )}
          <Link
            href={`/tenants/${tenant.id}`}
            className={cn(buttonClass("primary"), "px-3 py-2")}
          >
            Open
          </Link>
        </div>
      </div>

      {onTearDown && (
        <TeardownDialog
          tenant={tenant}
          open={confirmOpen}
          busy={tearingDown}
          onConfirm={() => {
            setConfirmOpen(false);
            onTearDown(tenant.id);
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
