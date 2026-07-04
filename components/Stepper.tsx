import { cn } from "@/lib/cn";
import { PROVISION_STEPS } from "@/lib/domain/provisioning";
import type { Tenant } from "@/lib/domain/types";
import { Icon } from "./icons";

type StepState = "done" | "active" | "pending";

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-iso">
        <Icon name="check" size={14} strokeWidth={3.2} className="text-white" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-prov">
        <Icon
          name="spinner"
          size={14}
          strokeWidth={2.6}
          className="animate-spin text-white"
        />
      </span>
    );
  }
  return (
    <span className="flex size-6 items-center justify-center rounded-full border-2 border-line-strong">
      <span className="size-1.5 rounded-full bg-ink3" />
    </span>
  );
}

/** The live provisioning theater: 5 steps that flip done as the tenant builds. */
export function Stepper({ tenant }: { tenant: Tenant }) {
  return (
    <div className="flex flex-col">
      {PROVISION_STEPS.map((step, i) => {
        const done = tenant.completedSteps.includes(step.key);
        const active = tenant.currentStep === step.key;
        const state: StepState = done ? "done" : active ? "active" : "pending";
        const last = i === PROVISION_STEPS.length - 1;

        return (
          <div key={step.key} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <StepIcon state={state} />
              {!last && (
                <div
                  className={cn(
                    "my-1 w-0.5 flex-1",
                    done ? "bg-iso" : "bg-line",
                  )}
                />
              )}
            </div>
            <div className={cn("flex flex-col gap-0.5", last ? "pb-0" : "pb-5")}>
              <span
                className={cn(
                  "text-sm",
                  state === "active" && "font-semibold text-ink",
                  state === "done" && "font-medium text-ink",
                  state === "pending" && "font-medium text-ink3",
                )}
              >
                {state === "active" ? step.activeLabel : step.doneLabel}
              </span>
              <span
                className={cn(
                  "font-mono text-xs",
                  state === "active"
                    ? "text-prov"
                    : state === "pending"
                      ? "text-ink3"
                      : "text-ink2",
                )}
              >
                {step.detail(tenant)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
