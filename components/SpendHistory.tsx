"use client";

import { useEffect, useState } from "react";
import { getFleetHistory, type FleetHistorySnapshot } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { formatRate } from "@/lib/format";

// Track a little past the ceiling so the $0.50 line sits with headroom, matching
// the CostMeter.
const TRACK_MAX = 0.6;
const CHART_HEIGHT = 96;

export function SpendHistory() {
  const [snap, setSnap] = useState<FleetHistorySnapshot | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    async function refresh() {
      try {
        const next = await getFleetHistory(controller.signal);
        if (!cancelled) setSnap(next);
      } catch {
        // transient poll failure — keep last value
      }
    }
    refresh();
    const id = setInterval(refresh, 3000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(id);
    };
  }, []);

  const samples = snap?.samples ?? [];
  const ceiling = snap?.ceiling ?? 0.5;
  const current = samples.at(-1)?.rate ?? 0;
  const ceilingFromBottom = (ceiling / TRACK_MAX) * 100;

  if (samples.length === 0) {
    return (
      <p className="py-6 text-sm text-ink3">
        Collecting fleet spend… (samples every 5s)
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative" style={{ height: CHART_HEIGHT }}>
        {/* $0.50 ceiling reference line */}
        <div
          className="absolute inset-x-0 border-t border-dashed border-ceiling"
          style={{ bottom: `${ceilingFromBottom}%` }}
        >
          <span className="absolute -top-2.5 right-0 bg-surface pl-1 text-[10px] font-medium text-ceiling">
            {formatRate(ceiling)}
          </span>
        </div>
        {/* bars — green while spending, a muted floor bar once torn down */}
        <div className="flex h-full items-end gap-[3px]">
          {samples.map((s, i) => (
            <div
              key={i}
              className={cn(
                "min-w-[3px] flex-1 rounded-t-sm",
                s.rate > 0 ? "bg-under" : "bg-line",
              )}
              style={{
                height: `${Math.min(s.rate / TRACK_MAX, 1) * 100}%`,
                minHeight: 3,
              }}
              title={formatRate(s.rate)}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-ink3">
        <span>~{Math.round((samples.length * 5) / 60)} min ago</span>
        <span className="font-mono text-under">now {formatRate(current)}</span>
      </div>
    </div>
  );
}
