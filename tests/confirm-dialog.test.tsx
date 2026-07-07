import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TeardownDialog } from "@/components/ConfirmDialog";
import { createTenant } from "@/lib/domain/tenant-factory";
import type { Tenant } from "@/lib/domain/types";

function runningTenant(): Tenant {
  const t = createTenant(
    { name: "Riverside Clinic", regionCode: "ewr", sliceSize: "a16-1_8", model: "Llama-3-8B" },
    0,
    0,
  );
  return { ...t, status: "running", billingStartedAt: 0 };
}

describe("TeardownDialog", () => {
  it("does not render when closed", () => {
    render(
      <TeardownDialog
        tenant={runningTenant()}
        open={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the tenant name and the cost-savings framing when open", () => {
    render(
      <TeardownDialog
        tenant={runningTenant()}
        open
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(
      screen.getByText("Tear down Riverside Clinic?"),
    ).toBeInTheDocument();
    // $0.06/hr * 24h = $1.44/day
    expect(screen.getByText(/\$1\.44\/day saved/)).toBeInTheDocument();
  });

  it("fires the right callbacks for confirm and cancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <TeardownDialog
        tenant={runningTenant()}
        open
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText("Tear down"));
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
