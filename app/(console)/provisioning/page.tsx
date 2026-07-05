"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, buttonClass } from "@/components/Button";
import { useNow, useTenantStream } from "@/components/hooks";
import { Icon } from "@/components/icons";
import { Field, Segmented, Select, TextInput } from "@/components/form";
import { IsolationBadgeCompact } from "@/components/IsolationBadge";
import { Stepper } from "@/components/Stepper";
import { createTenant, retryTenant } from "@/lib/api/client";
import {
  MODELS,
  REGIONS,
  SLICE_OPTIONS,
  regionsByContinent,
  sliceOption,
} from "@/lib/domain/catalog";
import { liveSessionCost } from "@/lib/domain/rates";
import type { SliceSize } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { formatRate, formatUsd } from "@/lib/format";

const CARD = "rounded-lg border border-line-subtle bg-surface p-6";

export default function ProvisioningPage() {
  const [name, setName] = useState("Harbor Free Clinic");
  const [regionCode, setRegionCode] = useState(REGIONS[0].code);
  const [sliceSize, setSliceSize] = useState<SliceSize>(SLICE_OPTIONS[0].size);
  const [model, setModel] = useState<string>(MODELS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const { tenant } = useTenantStream(createdId);
  const now = useNow(1000);
  const estimate = sliceOption(sliceSize).ratePerHour;
  // In flight for the whole provisioning run — not just the create request.
  const inFlight = submitting || tenant?.status === "provisioning";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("A tenant name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await createTenant({ name, regionCode, sliceSize, model });
      setCreatedId(created.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const [retrying, setRetrying] = useState(false);
  async function handleRetry() {
    if (!createdId) return;
    setRetrying(true);
    try {
      await retryTenant(createdId, regionCode);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Provisioning Console</h1>
        <p className="text-sm text-ink2">
          Spin up a dedicated, isolated inference endpoint in seconds — in the
          tenant’s own region.
        </p>
      </div>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        {/* Request form */}
        <form
          onSubmit={handleSubmit}
          className={cn(CARD, "flex w-full flex-col gap-5 lg:w-[440px] lg:shrink-0")}
        >
          <h2 className="text-base font-semibold text-ink">New tenant</h2>

          <Field label="Tenant name">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Harbor Free Clinic"
              aria-label="Tenant name"
              maxLength={60}
              disabled={inFlight}
            />
          </Field>

          <Field
            label="Region"
            hint="Deployed in the tenant’s own region — data never leaves it."
          >
            <Select
              value={regionCode}
              onChange={(e) => setRegionCode(e.target.value)}
              aria-label="Region"
              disabled={inFlight}
            >
              {regionsByContinent().map((group) => (
                <optgroup key={group.continent} label={group.continent}>
                  {group.regions.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label} · {r.country}
                      {r.atCapacity ? " (at capacity)" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>

          <Field label="GPU slice">
            <Segmented
              ariaLabel="GPU slice size"
              value={sliceSize}
              onChange={(v) => setSliceSize(v as SliceSize)}
              disabled={inFlight}
              options={SLICE_OPTIONS.map((s) => ({
                value: s.size,
                title: `${s.accelerator} · ${s.fraction}`,
                subtitle: formatRate(s.ratePerHour),
              }))}
            />
          </Field>

          <Field label="Model to preload">
            <Select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              aria-label="Model to preload"
              disabled={inFlight}
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-center gap-3 rounded-md bg-track px-3.5 py-3">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-ink2">Estimated cost</span>
              <span className="text-[11px] text-under">
                well under the $0.50/hr ceiling
              </span>
            </div>
            <span className="ml-auto font-mono text-xl font-medium text-under">
              {formatRate(estimate)}
            </span>
          </div>

          {error && <p className="text-sm text-over">{error}</p>}

          <Button
            type="submit"
            leftIcon="zap"
            loading={inFlight}
            disabled={!name.trim()}
          >
            {inFlight ? "Provisioning…" : "Provision dedicated endpoint"}
          </Button>
        </form>

        {/* Provisioning theater */}
        <div className={cn(CARD, "flex w-full flex-col gap-4")}>
          {!createdId || !tenant ? (
            <ReadyState />
          ) : (
            <Theater
              tenant={tenant}
              now={now}
              onRetry={handleRetry}
              retrying={retrying}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ReadyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-iso-bg">
        <Icon name="zap" size={20} className="text-iso" />
      </div>
      <p className="max-w-xs text-sm text-ink2">
        Fill in the form and provision — the isolation badge builds and the cost
        meter starts ticking live, right here.
      </p>
    </div>
  );
}

function Theater({
  tenant,
  now,
  onRetry,
  retrying,
}: {
  tenant: import("@/lib/domain/types").Tenant;
  now: number;
  onRetry: () => void;
  retrying: boolean;
}) {
  const router = useRouter();
  const [navigating, startNav] = useTransition();
  const live = tenant.status === "running";
  const failed = tenant.status === "failed";
  const confirmed = [
    tenant.isolation.gpuSlice.confirmed,
    tenant.isolation.vpc.confirmed,
    tenant.isolation.bucket.confirmed,
  ].filter(Boolean).length;
  const session = liveSessionCost(tenant, now);

  return (
    <>
      <div className="flex items-center gap-3">
        <h2
          className={cn(
            "text-base font-semibold",
            failed ? "text-over" : "text-ink",
          )}
        >
          {failed
            ? "Provisioning failed"
            : live
              ? "Endpoint live"
              : `Provisioning ${tenant.name}…`}
        </h2>
        {!failed && (
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-track px-3 py-1.5">
            <span className="size-[7px] rounded-full bg-under" />
            <span className="font-mono text-xs font-medium text-ink">
              {formatRate(tenant.ratePerHour)}
            </span>
            <span className="text-xs text-ink3">
              · {session > 0 ? `${formatUsd(session)} so far` : "ticking"}
            </span>
          </span>
        )}
      </div>

      <Stepper tenant={tenant} />

      {failed && (
        <div className="flex flex-col gap-3 rounded-md bg-danger-bg p-4">
          <div className="flex items-start gap-2.5">
            <Icon
              name="alert-triangle"
              size={18}
              className="mt-0.5 shrink-0 text-over"
            />
            <span className="text-[13px] text-over">
              {tenant.failure?.message} No resources were charged — retry, or pick
              a different region above and retry.
            </span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className={cn(buttonClass("primary"), "self-start px-3 py-2")}
          >
            {retrying ? "Retrying…" : "Retry provisioning"}
          </button>
        </div>
      )}

      {live && tenant.endpointUrl && (
        <div className="flex flex-col gap-3 rounded-md bg-iso-bg p-4">
          <span className="text-xs font-medium text-iso-strong">
            Private endpoint
          </span>
          <span className="font-mono text-[13px] text-ink">
            {tenant.endpointUrl}
          </span>
          <div className="flex gap-2">
            <Button
              variant="primary"
              loading={navigating}
              onClick={() => startNav(() => router.push(`/tenants/${tenant.id}`))}
              className="px-3 py-2"
            >
              {navigating ? "Opening…" : "View tenant"}
            </Button>
            <Link
              href="/playground"
              className={cn(buttonClass("ghost"), "px-3 py-2")}
            >
              Open Playground
            </Link>
          </div>
        </div>
      )}

      {!failed && (
        <div className="flex flex-col gap-2.5 border-t border-line-subtle pt-4">
          <span className="text-xs font-medium text-iso-strong">
            Isolation confirmed as each resource is created — {confirmed} / 3
          </span>
          <IsolationBadgeCompact isolation={tenant.isolation} />
        </div>
      )}
    </>
  );
}
