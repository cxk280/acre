import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icons";

export type ButtonVariant = "primary" | "ghost" | "danger";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-on hover:bg-brand-hover",
  ghost: "border border-line text-ink2 hover:bg-subtle",
  danger: "border border-tear text-tear hover:bg-tear-bg",
};

/** Class string for the button look — reusable on links styled as buttons. */
export function buttonClass(variant: ButtonVariant = "primary"): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5",
    "text-sm font-medium transition-colors select-none disabled:opacity-50 disabled:pointer-events-none",
    VARIANT[variant],
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  leftIcon?: IconName;
}

export function Button({
  variant = "primary",
  leftIcon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={cn(buttonClass(variant), className)} {...props}>
      {leftIcon && <Icon name={leftIcon} size={16} strokeWidth={2.2} />}
      {children}
    </button>
  );
}
