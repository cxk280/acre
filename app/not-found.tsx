import Link from "next/link";
import { buttonClass } from "@/components/Button";
import { Mark } from "@/components/Mark";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas p-6 text-center">
      <Mark size={44} />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-ink">Page not found</h1>
        <p className="max-w-sm text-sm text-ink2">
          That page doesn’t exist. Head back to your tenants to provision or open
          a dedicated endpoint.
        </p>
      </div>
      <Link href="/tenants" className={buttonClass("primary")}>
        Back to tenants
      </Link>
    </div>
  );
}
