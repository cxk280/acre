"use client";

import { Mark } from "@/components/Mark";
import { buttonClass } from "@/components/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas p-6 text-center">
      <Mark size={44} />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
        <p className="max-w-sm text-sm text-ink2">
          {error.message || "An unexpected error occurred."}
        </p>
      </div>
      <button type="button" onClick={reset} className={buttonClass("primary")}>
        Try again
      </button>
    </div>
  );
}
