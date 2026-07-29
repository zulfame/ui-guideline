import { useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STEPS = ["Step One", "Step Two", "Step Three"];

/**
 * StepIndicator — presentational step progress (dots + connectors + labels).
 * Controlled via `steps` (labels) + `current` (active index). Reusable in wizards.
 */
export function StepIndicator({ steps = STEPS, current = 0, className }) {
  return (
    <div className={cn("flex items-center", className)} data-testid="step-indicator">
      {steps.map((s, i) => (
        <div key={s} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                i < current && "border-primary bg-primary text-primary-foreground",
                i === current && "border-primary text-primary",
                i > current && "border-border text-muted-foreground",
              )}
            >
              {i < current ? <Check className="size-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-xs",
                i === current ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "mx-2 h-px flex-1",
                i < current ? "bg-primary" : "bg-border",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/** Stepper — standalone demo (self-contained state + Back/Next) for the catalog. */
export function Stepper() {
  const [current, setCurrent] = useState(0);

  return (
    <div className="w-full max-w-md space-y-6" data-testid="stepper">
      <StepIndicator steps={STEPS} current={current} />
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={current === 0}
          onClick={() => setCurrent((c) => c - 1)}
        >
          Back
        </Button>
        <Button
          size="sm"
          disabled={current === STEPS.length - 1}
          onClick={() => setCurrent((c) => c + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
