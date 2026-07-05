"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClass } from "@/components/Button";
import { useTenants } from "@/components/hooks";
import { Icon } from "@/components/icons";
import { TenantCard } from "@/components/TenantCard";
import { teardownTenant } from "@/lib/api/client";
import { cn } from "@/lib/cn";

export default function TenantsPage() {
  const { tenants, error, refresh } = useTenants();
  const [tearingId, setTearingId] = useState<string | null>(null);

  async function handleTearDown(id: string) {
    setTearingId(id);
    try {
      await teardownTenant(id);
      await refresh();
    } finally {
      setTearingId(null);
    }
  }

  // A torn-down tenant is released — drop it from the list (same as the fleet
  // meter and Admin view, which already exclude "stopped").
  const visible = tenants?.filter((t) => t.status !== "stopped") ?? null;
  const running = visible?.filter((t) => t.status === "running").length ?? 0;
  const idle = visible?.filter((t) => t.status === "idle").length ?? 0;
  const isEmpty = visible !== null && visible.length === 0;

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 p-8">
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink">Tenants</h1>
          <p className="text-sm text-ink2">
            {tenants === null
              ? "Loading dedicated endpoints…"
              : `${running} running · ${idle} idle · dedicated endpoints across your regions`}
          </p>
        </div>
        <Link href="/provisioning" className={cn(buttonClass("primary"), "ml-auto")}>
          <Icon name="plus" size={16} strokeWidth={2.4} />
          Create tenant
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-line-subtle bg-tear-bg px-4 py-3 text-sm text-tear">
          Couldn’t load tenants: {error}
        </div>
      )}

      {tenants === null && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-lg border border-line-subtle bg-subtle"
            />
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center">
          <div className="relative size-12 rounded-lg bg-brand">
            <div className="absolute bottom-1.5 right-1.5 size-[18px] rounded-md bg-iso" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-ink">
              Create your first dedicated endpoint
            </h2>
            <p className="max-w-md text-sm text-ink2">
              A private, isolated fractional-GPU AI endpoint in your own region —
              live in seconds, for well under $0.50/hr.
            </p>
          </div>
          <Link href="/provisioning" className={buttonClass("primary")}>
            <Icon name="plus" size={16} strokeWidth={2.4} />
            Create tenant
          </Link>
        </div>
      )}

      {visible && visible.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {visible.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              onTearDown={handleTearDown}
              tearingDown={tearingId === tenant.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
