import { COST_CEILING_PER_HOUR } from "@/lib/domain/rates";
import { formatDuration, formatUsd } from "@/lib/format";

// The track scales a little past the ceiling so the $0.50 line sits at ~83%
// with visible headroom — the green fill always stops short of it.
const TRACK_MAX = 0.6;
const CEILING_PCT = (COST_CEILING_PER_HOUR / TRACK_MAX) * 100;

function fillPct(rate: number): number {
  return Math.min(rate / TRACK_MAX, 1) * 100;
}

function fillColor(rate: number): string {
  if (rate >= COST_CEILING_PER_HOUR) return "bg-over";
  if (rate >= COST_CEILING_PER_HOUR * 0.85) return "bg-warn";
  return "bg-under";
}

function Track({
  rate,
  height,
  tickTall,
}: {
  rate: number;
  height: number;
  tickTall?: boolean;
}) {
  return (
    <div
      className="relative w-full rounded-full bg-track"
      style={{ height }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={COST_CEILING_PER_HOUR}
      aria-valuenow={rate}
      aria-label="Live cost per hour, under the $0.50 ceiling"
    >
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${fillColor(rate)}`}
        style={{ width: `${fillPct(rate)}%` }}
      />
      <div
        className="absolute w-0.5 rounded-full bg-ceiling"
        style={{
          left: `${CEILING_PCT}%`,
          top: tickTall ? -5 : 0,
          bottom: tickTall ? -5 : 0,
        }}
      />
    </div>
  );
}

export function CostMeterInline({ ratePerHour }: { ratePerHour: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[15px] font-medium text-ink">
          {formatUsd(ratePerHour)}
        </span>
        <span className="text-xs text-ink3">/hr</span>
        <span className="ml-auto text-[11px] font-medium text-under">
          under $0.50
        </span>
      </div>
      <Track rate={ratePerHour} height={6} />
    </div>
  );
}

export function CostMeterProminent({
  ratePerHour,
  sessionCost,
  elapsedMs,
}: {
  ratePerHour: number;
  sessionCost: number;
  elapsedMs: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line-subtle bg-surface p-5">
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink3">
        Live cost
      </span>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-[34px] font-medium leading-none text-ink">
          {formatUsd(ratePerHour)}
        </span>
        <span className="text-[15px] text-ink3">/hr</span>
      </div>
      <Track rate={ratePerHour} height={10} tickTall />
      <div className="flex justify-between text-[11px]">
        <span className="text-ink3">$0</span>
        <span className="font-medium text-ceiling">$0.50 ceiling</span>
      </div>
      <div className="flex items-center justify-between border-t border-line-subtle pt-3">
        <span className="text-xs text-ink2">Session total</span>
        <span className="font-mono text-[13px] font-medium text-ink">
          {formatUsd(sessionCost)} · {formatDuration(elapsedMs)}
        </span>
      </div>
    </div>
  );
}
