import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IsolationMatrix } from "@/components/IsolationMatrix";
import { createTenant } from "@/lib/domain/tenant-factory";
import type { Tenant } from "@/lib/domain/types";

function running(i: number): Tenant {
  const t = createTenant(
    { name: `Tenant ${i}`, regionCode: "ewr", sliceSize: "a16-1_8", model: "Llama-3-8B" },
    i,
    0,
  );
  return {
    ...t,
    status: "running",
    isolation: {
      gpuSlice: { ...t.isolation.gpuSlice, confirmed: true },
      vpc: { ...t.isolation.vpc, confirmed: true },
      bucket: { ...t.isolation.bucket, confirmed: true },
    },
  };
}

describe("IsolationMatrix", () => {
  it("renders a distinct VPC and bucket per tenant (no shared cells)", () => {
    const a = running(0);
    const b = running(1);
    render(<IsolationMatrix tenants={[a, b]} />);

    expect(screen.getByText(a.isolation.bucket.id)).toBeInTheDocument();
    expect(screen.getByText(b.isolation.bucket.id)).toBeInTheDocument();
    expect(a.isolation.vpc.id).not.toBe(b.isolation.vpc.id);
    expect(
      screen.getByText(new RegExp(a.isolation.vpc.id)),
    ).toBeInTheDocument();
  });

  it("shows an empty message when there are no active tenants", () => {
    render(<IsolationMatrix tenants={[]} />);
    expect(screen.getByText(/No active tenants/)).toBeInTheDocument();
  });
});
