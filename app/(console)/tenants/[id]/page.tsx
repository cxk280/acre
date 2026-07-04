"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/Button";
import { TeardownDialog } from "@/components/ConfirmDialog";
import { CostMeterProminent } from "@/components/CostMeter";
import { useNow, useTenant } from "@/components/hooks";
import { Icon } from "@/components/icons";
import { IsolationBadgeExpanded } from "@/components/IsolationBadge";
import { StatusPill } from "@/components/StatusPill";
import { teardownTenant } from "@/lib/api/client";
import { liveSessionCost } from "@/lib/domain/rates";
import type { Tenant } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";

const CARD = "rounded-lg border border-line-subtle bg-surface p-5";

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const { tenant, error } = useTenant(params.id);
  const now = useNow(1000);

  if (error) {
    return (
      <div className="mx-auto max-w-[1200px] p-8">
        <div className="rounded-lg border border-line-subtle bg-surface p-8 text-center">
          <p className="text-sm text-ink2">Tenant not found: {error}</p>
          <Link href="/tenants" className={cn(buttonClass("ghost"), "mt-4 inline-flex")}>
            Back to tenants
          </Link>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="mx-auto max-w-[1200px] p-8">
        <div className="h-64 animate-pulse rounded-lg border border-line-subtle bg-subtle" />
      </div>
    );
  }

  return <TenantDetail tenant={tenant} now={now} />;
}

function TenantDetail({ tenant, now }: { tenant: Tenant; now: number }) {
  const [tearing, setTearing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canTearDown =
    tenant.status !== "stopped" && tenant.status !== "tearing_down";
  const uptimeMs =
    tenant.provisionedAt && tenant.status === "running"
      ? now - tenant.provisionedAt
      : 0;

  async function handleTearDown() {
    setConfirmOpen(false);
    setTearing(true);
    try {
      await teardownTenant(tenant.id);
    } finally {
      setTearing(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/tenants"
          className="flex size-9 items-center justify-center rounded-md border border-line bg-surface text-ink2 hover:bg-subtle"
          aria-label="Back to tenants"
        >
          <Icon name="arrow-left" size={16} />
        </Link>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold text-ink">{tenant.name}</h1>
            <StatusPill status={tenant.status} />
          </div>
          <span className="text-[13px] text-ink2">
            {tenant.region} · {tenant.id}
          </span>
        </div>
        {canTearDown && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={tearing}
            className={cn(buttonClass("danger"), "ml-auto")}
          >
            {tearing ? "Tearing down…" : "Tear down"}
          </button>
        )}
      </div>

      <TeardownDialog
        tenant={tenant}
        open={confirmOpen}
        busy={tearing}
        onConfirm={handleTearDown}
        onCancel={() => setConfirmOpen(false)}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: endpoint + activity */}
        <div className="flex flex-1 flex-col gap-6">
          <EndpointCard tenant={tenant} uptimeMs={uptimeMs} />
          <ActivityCard tenant={tenant} now={now} />
        </div>

        {/* Right: cost + isolation */}
        <div className="flex w-full flex-col gap-6 lg:w-[380px] lg:shrink-0">
          <CostMeterProminent
            ratePerHour={tenant.ratePerHour}
            sessionCost={liveSessionCost(tenant, now)}
            elapsedMs={
              tenant.billingStartedAt
                ? (tenant.billingStoppedAt ?? now) - tenant.billingStartedAt
                : 0
            }
          />
          <div className={CARD}>
            <Eyebrow>Isolation — proven</Eyebrow>
            <div className="mt-3">
              <IsolationBadgeExpanded isolation={tenant.isolation} />
            </div>
          </div>
        </div>
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

function EndpointCard({ tenant, uptimeMs }: { tenant: Tenant; uptimeMs: number }) {
  const [copied, setCopied] = useState(false);
  const url = tenant.endpointUrl;
  const modelSlug = tenant.model.toLowerCase().replace(/\s+/g, "-");
  const healthy = tenant.status === "running";

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — no-op
    }
  }

  return (
    <div className={cn(CARD, "flex flex-col gap-4")}>
      <Eyebrow>Endpoint</Eyebrow>

      <div className="flex items-center gap-2 rounded-md bg-inset px-3 py-2.5">
        <span className="font-mono text-[13px] text-ink">
          {url ?? "Endpoint released"}
        </span>
        {url && (
          <button
            type="button"
            onClick={copy}
            className="ml-auto flex size-[30px] items-center justify-center rounded-sm bg-surface text-ink2 hover:text-ink"
            aria-label="Copy endpoint URL"
          >
            <Icon name="copy" size={15} />
          </button>
        )}
      </div>
      {copied && <span className="text-xs text-iso-strong">Copied to clipboard</span>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Model" value={tenant.model} />
        <Stat
          label="Health"
          value={healthy ? "● Healthy" : "—"}
          valueClass={healthy ? "text-run" : "text-ink3"}
        />
        <Stat label="Region" value={tenant.region.split(" · ")[0]} />
        <Stat
          label="Uptime"
          value={uptimeMs > 0 ? formatDuration(uptimeMs) : "—"}
        />
      </div>

      <div className="flex flex-col gap-1.5 rounded-md bg-inset px-3.5 py-3 font-mono text-xs">
        <span className="text-ink2">
          curl {url ?? "https://<endpoint>/v1"}/chat/completions \
        </span>
        <span className="text-ink2">
          {"  "}-H &quot;Authorization: Bearer $ACRE_KEY&quot; \
        </span>
        <span className="text-iso">
          {"  "}-d &apos;&#123;&quot;model&quot;:&quot;{modelSlug}&quot;,&quot;messages&quot;:[…]&#125;&apos;
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-ink3">{label}</span>
      <span className={cn("text-[15px] font-semibold text-ink", valueClass)}>
        {value}
      </span>
    </div>
  );
}

interface ActivityEvent {
  label: string;
  color: string;
}

function activityFor(tenant: Tenant): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  if (tenant.status === "running") {
    events.push({ label: "Endpoint live", color: "bg-run" });
    events.push({ label: `Model ${tenant.model} loaded`, color: "bg-ink3" });
  }
  if (tenant.status === "stopped") {
    events.push({ label: "Tenant torn down — resources released", color: "bg-stop" });
  }
  if (tenant.isolation.bucket.confirmed) {
    events.push({
      label: `Private bucket ${tenant.isolation.bucket.id} created`,
      color: "bg-iso",
    });
  }
  if (tenant.isolation.vpc.confirmed) {
    events.push({
      label: `Private VPC ${tenant.isolation.vpc.id} created`,
      color: "bg-iso",
    });
  }
  if (tenant.isolation.gpuSlice.confirmed) {
    events.push({
      label: `GPU slice ${tenant.isolation.gpuSlice.id} reserved`,
      color: "bg-iso",
    });
  }
  return events;
}

function ActivityCard({ tenant, now }: { tenant: Tenant; now: number }) {
  const events = activityFor(tenant);
  const ago = formatDuration(now - tenant.createdAt);

  return (
    <div className={cn(CARD, "flex flex-col gap-3")}>
      <Eyebrow>Activity</Eyebrow>
      {events.length === 0 ? (
        <p className="text-sm text-ink3">Provisioning…</p>
      ) : (
        events.map((event, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className={cn("size-[7px] rounded-full", event.color)} />
            <span className="text-[13px] text-ink">{event.label}</span>
            <span className="ml-auto font-mono text-[11px] text-ink3">
              {ago} ago
            </span>
          </div>
        ))
      )}
    </div>
  );
}
