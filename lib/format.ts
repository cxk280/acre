// Display formatting helpers shared across views.

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatRate(perHour: number): string {
  return `$${perHour.toFixed(2)}/hr`;
}

/** Compact elapsed duration, e.g. "2h 21m", "6m", "0m". */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
