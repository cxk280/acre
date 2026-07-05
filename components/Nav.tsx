"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icons";

interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  /** Present in the design but out of scope for this build. */
  soon?: boolean;
  match: (pathname: string) => boolean;
}

const ITEMS: NavItem[] = [
  {
    label: "Tenants",
    href: "/tenants",
    icon: "server",
    match: (p) => p === "/tenants" || p.startsWith("/tenants/"),
  },
  {
    label: "Provisioning Console",
    href: "/provisioning",
    icon: "zap",
    match: (p) => p === "/provisioning",
  },
  {
    label: "Playground",
    href: "/playground",
    icon: "terminal",
    match: (p) => p === "/playground",
  },
  {
    label: "Admin",
    href: "/admin",
    icon: "sliders",
    match: (p) => p === "/admin",
  },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-60 flex-col gap-1 border-r border-line-subtle bg-surface p-3">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        const className = cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] font-medium",
          active && "bg-brand-bg text-brand",
          !active && !item.soon && "text-ink2 hover:bg-subtle",
          item.soon && "cursor-not-allowed text-ink3",
        );

        const content = (
          <>
            <Icon
              name={item.icon}
              size={18}
              className={
                active ? "text-brand" : item.soon ? "text-ink3" : "text-ink3"
              }
            />
            {item.label}
            {item.soon && (
              <span className="ml-auto text-[10px] uppercase tracking-wide text-ink3">
                soon
              </span>
            )}
          </>
        );

        if (item.soon) {
          return (
            <span key={item.label} className={className} aria-disabled="true">
              {content}
            </span>
          );
        }
        return (
          <Link
            key={item.label}
            href={item.href}
            className={className}
            aria-current={active ? "page" : undefined}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
