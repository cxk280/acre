"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { dailySavings } from "@/lib/domain/rates";
import type { Tenant } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { formatRate, formatUsd } from "@/lib/format";
import { Icon } from "./icons";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: ReactNode;
  highlight?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  highlight,
  confirmLabel,
  cancelLabel = "Cancel",
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-full max-w-[420px] flex-col gap-4 rounded-lg border border-line-subtle bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="text-[13px] leading-relaxed text-ink2">{body}</p>
        {highlight}
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line px-4 py-2.5 text-[13px] font-medium text-ink2 hover:bg-subtle"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "rounded-md bg-over px-4 py-2.5 text-[13px] font-semibold text-white",
              "hover:opacity-90 disabled:opacity-50",
            )}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Teardown-specific confirm, with the cost-savings framing from VIEWS.md §6. */
export function TeardownDialog({
  tenant,
  open,
  busy,
  onConfirm,
  onCancel,
}: {
  tenant: Tenant;
  open: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      busy={busy}
      title={`Tear down ${tenant.name}?`}
      confirmLabel="Tear down"
      onConfirm={onConfirm}
      onCancel={onCancel}
      body="This immediately releases its GPU slice, private VPC, and bucket. In-flight requests stop. This can’t be undone."
      highlight={
        <div className="flex items-center gap-2.5 rounded-md bg-iso-bg px-3.5 py-3">
          <Icon name="trending-down" size={18} className="text-iso" />
          <span className="text-[13px] font-medium text-iso-strong">
            You’ll stop paying {formatRate(tenant.ratePerHour)} — about{" "}
            {formatUsd(dailySavings(tenant.ratePerHour))}/day saved.
          </span>
        </div>
      }
    />
  );
}
