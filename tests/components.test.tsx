import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CostMeterInline } from "@/components/CostMeter";
import { IsolationBadgeExpanded } from "@/components/IsolationBadge";
import { StatusPill } from "@/components/StatusPill";
import { Stepper } from "@/components/Stepper";
import { applyProvisionStep } from "@/lib/domain/provisioning";
import { createTenant } from "@/lib/domain/tenant-factory";

function tenant() {
  return createTenant(
    { name: "T", regionCode: "ewr", sliceSize: "a16-1_8", model: "Llama-3-8B" },
    0,
    0,
  );
}

describe("StatusPill", () => {
  it("renders the human label for a status", () => {
    render(<StatusPill status="running" />);
    expect(screen.getByText("Running")).toBeInTheDocument();
  });
});

describe("CostMeterInline", () => {
  it("shows the rate, the under-ceiling note, and an accessible meter", () => {
    render(<CostMeterInline ratePerHour={0.03} />);
    expect(screen.getByText("$0.03")).toBeInTheDocument();
    expect(screen.getByText("under $0.50")).toBeInTheDocument();
    const meter = screen.getByRole("meter");
    expect(meter.getAttribute("aria-valuenow")).toBe("0.03");
    expect(meter.getAttribute("aria-valuemax")).toBe("0.5");
  });
});

describe("IsolationBadgeExpanded", () => {
  it("renders concrete resource identifiers for each isolated resource", () => {
    const t = tenant();
    render(<IsolationBadgeExpanded isolation={t.isolation} />);
    expect(screen.getByText(t.isolation.bucket.id)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(t.isolation.vpc.id)),
    ).toBeInTheDocument();
  });
});

describe("Stepper", () => {
  it("shows a completed step's done label and the active step's active label", () => {
    let t = tenant();
    t = applyProvisionStep(t, "slice", 1000);
    t = { ...t, currentStep: "vpc" };
    render(<Stepper tenant={t} />);
    expect(screen.getByText("Reserved fractional GPU slice")).toBeInTheDocument();
    expect(screen.getByText("Creating private VPC")).toBeInTheDocument();
  });
});
