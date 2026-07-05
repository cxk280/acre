import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icons";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink2">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink3">{hint}</span>}
    </div>
  );
}

const CONTROL =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink3 " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-subtle";

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(CONTROL, "appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink3"
      />
    </div>
  );
}

export interface SegmentedOption {
  value: string;
  title: string;
  subtitle: string;
}

export function Segmented({
  options,
  value,
  onChange,
  ariaLabel,
  disabled,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn("flex gap-2", disabled && "opacity-60")}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            type="button"
            key={o.value}
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-md border px-3 py-2.5 transition-colors",
              disabled && "cursor-not-allowed",
              active
                ? "border-iso bg-iso-bg"
                : "border-line-subtle bg-subtle hover:border-line",
            )}
          >
            <span
              className={cn(
                "text-[13px] font-semibold",
                active ? "text-iso-strong" : "text-ink",
              )}
            >
              {o.title}
            </span>
            <span
              className={cn(
                "font-mono text-[11px]",
                active ? "text-iso-strong" : "text-ink3",
              )}
            >
              {o.subtitle}
            </span>
          </button>
        );
      })}
    </div>
  );
}
