import Link from "next/link";
import { buttonClass } from "@/components/Button";
import { Mark } from "@/components/Mark";

// Minimal, stubbed sign-in per VIEWS.md §6 — access is not actually enforced in
// the demo; both actions drop you into the console.
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-subtle p-6">
      <div className="flex w-full max-w-[360px] flex-col items-center gap-4 rounded-lg border border-line-subtle bg-surface p-7 shadow-lg">
        <div className="flex items-center gap-2.5">
          <Mark size={28} />
          <span className="text-lg font-semibold text-ink">Acre</span>
        </div>
        <p className="text-sm text-ink2">Sign in to your console</p>

        <input
          type="email"
          placeholder="you@organization.org"
          aria-label="Email"
          className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink3"
        />
        <Link href="/tenants" className={`${buttonClass("primary")} w-full`}>
          Continue
        </Link>
        <Link href="/tenants" className={`${buttonClass("ghost")} w-full`}>
          Continue with SSO
        </Link>
        <span className="text-[11px] text-ink3">
          Demo environment · access is stubbed
        </span>
      </div>
    </div>
  );
}
