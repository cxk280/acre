"use client";

import { useState } from "react";
import { buttonClass } from "@/components/Button";
import { useTenants } from "@/components/hooks";
import { Icon } from "@/components/icons";
import { IsolationMatrix } from "@/components/IsolationMatrix";
import { teardownAllTenants } from "@/lib/api/client";
import { computeFleetSummary } from "@/lib/domain/fleet";
import { isBillingActive } from "@/lib/domain/rates";
import type { Tenant } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { formatRate, formatUsd } from "@/lib/format";

const CARD = "rounded-lg border border-line-subtle bg-surface p-5";

export default function AdminPage() {
  const { tenants, refresh } = useTenants(2500);
  const [tearing, setTearing] = useState(false);
  const summary = computeFleetSummary(tenants ?? []);

  async function tearDownAll() {
    setTearing(true);
    try {
      await teardownAllTenants();
      await refresh();
    } finally {
      setTearing(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Fleet overview</h1>
        <p className="text-sm text-ink2">
          Every tenant isolated — its own GPU slice, VPC, and bucket. Nothing
          shared.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile
          label="Live tenants"
          value={String(summary.activeTenants)}
          sub={`${summary.runningTenants} running · ${summary.idleTenants} idle`}
        />
        <Tile
          label="Fleet spend"
          value={`${formatRate(summary.fleetRatePerHour)}`}
          sub="live, elastic"
          valueClass="text-under"
        />
        <Tile
          label="Regions in use"
          value={String(summary.regions.length)}
          sub={summary.regions.map((r) => r.split(" · ")[0]).join(" · ") || "—"}
        />
        <Tile
          label="GPU slices"
          value={String(summary.sliceCount)}
          sub="one dedicated slice each"
        />
      </div>

      <div className={cn(CARD, "flex flex-col gap-4")}>
        <Eyebrow>Isolation matrix — no shared cells</Eyebrow>
        <IsolationMatrix tenants={tenants ?? []} />
      </div>

      <div className={cn(CARD, "flex flex-col gap-4")}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <Eyebrow>Fleet spend by tenant</Eyebrow>
            <span className="text-xs text-ink2">
              Elastic: tear a tenant down and its spend drops to zero.
            </span>
          </div>
          <button
            type="button"
            onClick={tearDownAll}
            disabled={tearing || summary.activeTenants === 0}
            className={cn(buttonClass("danger"), "ml-auto")}
          >
            <Icon name="trash" size={15} />
            {tearing ? "Tearing down…" : "Tear down all demo tenants"}
          </button>
        </div>
        <SpendBars tenants={tenants ?? []} />
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink3">
      {children}
    </span>
  );
}

function Tile({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className={cn(CARD, "flex flex-col gap-1.5")}>
      <Eyebrow>{label}</Eyebrow>
      <span className={cn("text-[26px] font-semibold text-ink", valueClass)}>
        {value}
      </span>
      <span className="text-xs text-ink2">{sub}</span>
    </div>
  );
}

function SpendBars({ tenants }: { tenants: Tenant[] }) {
  const billing = tenants.filter(isBillingActive);
  if (billing.length === 0) {
    return (
      <p className="py-4 text-sm text-ink3">
        No billing tenants right now — fleet spend is $0.00/hr.
      </p>
    );
  }
  // Scale bars against the $0.50 ceiling so the "well under" story is visible.
  return (
    <div className="flex flex-col gap-3">
      {billing.map((t) => (
        <div key={t.id} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-[13px] text-ink">
            {t.name}
          </span>
          <div className="relative h-2.5 flex-1 rounded-full bg-track">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-under"
              style={{ width: `${Math.min(t.ratePerHour / 0.5, 1) * 100}%` }}
            />
            <div className="absolute inset-y-0 right-0 w-0.5 rounded-full bg-ceiling" />
          </div>
          <span className="w-16 shrink-0 text-right font-mono text-[13px] text-under">
            {formatUsd(t.ratePerHour)}
          </span>
        </div>
      ))}
    </div>
  );
}
