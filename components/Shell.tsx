import type { ReactNode } from "react";
import { FleetMeter } from "./FleetMeter";
import { Icon } from "./icons";
import { Nav } from "./Nav";

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      {/* A brand square with a teal "slice" — a fraction of the whole GPU. */}
      <div className="relative size-[26px] rounded-md bg-brand">
        <div className="absolute bottom-[3px] right-[3px] size-2.5 rounded-sm bg-iso" />
      </div>
      <span className="text-[17px] font-semibold text-ink">Acre</span>
    </div>
  );
}

function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line-subtle bg-surface px-5">
      <Wordmark />
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md border border-line-subtle bg-subtle px-2.5 py-[7px] text-[13px] font-medium text-ink2"
      >
        <Icon name="pin" size={15} className="text-ink2" />
        All regions
        <Icon name="chevron-down" size={14} className="text-ink3" />
      </button>
      <div className="ml-auto flex items-center gap-4">
        <FleetMeter />
        <div className="size-[30px] rounded-full bg-brand" />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Nav />
        <main className="flex-1 overflow-auto bg-canvas">{children}</main>
      </div>
    </div>
  );
}
