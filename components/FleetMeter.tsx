"use client";

import { useEffect, useState } from "react";
import { listTenants } from "@/lib/api/client";
import { isBillingActive } from "@/lib/domain/rates";
import { formatUsd } from "@/lib/format";

// Live top-bar meter: the summed $/hr across billing tenants, refreshed on a
// poll so it ticks as tenants provision and tear down.
export function FleetMeter() {
  const [fleetRate, setFleetRate] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function refresh() {
      try {
        const tenants = await listTenants(controller.signal);
        if (cancelled) return;
        const active = tenants.filter((t) => t.status !== "stopped");
        setCount(active.length);
        setFleetRate(
          active
            .filter(isBillingActive)
            .reduce((sum, t) => sum + t.ratePerHour, 0),
        );
      } catch {
        // transient poll failure — keep the last known value
      }
    }

    refresh();
    const interval = setInterval(refresh, 2500);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-full bg-iso-bg px-3 py-[7px]">
      <span className="size-[7px] rounded-full bg-iso" />
      <span className="text-xs font-medium text-ink2">Fleet</span>
      <span className="font-mono text-[13px] font-medium text-ink">
        {formatUsd(fleetRate)}/hr
      </span>
      <span className="text-xs text-ink3">
        · {count} {count === 1 ? "tenant" : "tenants"}
      </span>
    </div>
  );
}
