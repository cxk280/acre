"use client";

import { useCallback, useEffect, useState } from "react";
import { getTenant, listTenants } from "@/lib/api/client";
import type { Tenant } from "@/lib/domain/types";

/** A clock that ticks on an interval — drives the live cost-meter accrual. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

interface TenantsState {
  tenants: Tenant[] | null;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTenants(intervalMs = 2000): TenantsState {
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const next = await listTenants(signal);
      setTenants(next);
      setError(null);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    const id = setInterval(() => refresh(controller.signal), intervalMs);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [intervalMs, refresh]);

  return { tenants, error, refresh: () => refresh() };
}

interface TenantState {
  tenant: Tenant | null;
  error: string | null;
}

/** Poll a single tenant (fast enough to animate the provisioning theater). */
export function useTenant(id: string | null, intervalMs = 900): TenantState {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setTenant(null);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;

    async function refresh() {
      try {
        const next = await getTenant(id as string, controller.signal);
        if (!cancelled) {
          setTenant(next);
          setError(null);
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        if (!cancelled) setError((e as Error).message);
      }
    }

    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [id, intervalMs]);

  return { tenant, error };
}
