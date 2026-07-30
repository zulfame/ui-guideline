import { Rows2, Rows3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDensity } from "@/components/density-provider";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "dense", label: "Dense", icon: Rows3 },
  { value: "comfortable", label: "Comfortable", icon: Rows2 },
];

/** DensityToggle — dropdown for Dense / Comfortable UI density. */
export function DensityToggle() {
  const { density, setDensity } = useDensity();
  const Icon = density === "comfortable" ? Rows2 : Rows3;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          data-testid="density-toggle-trigger"
          aria-label="Toggle density"
        >
          <Icon className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {OPTIONS.map(({ value, label, icon: OptIcon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setDensity(value)}
            data-testid={`density-option-${value}`}
            className={cn(density === value && "bg-accent text-accent-foreground")}
          >
            <OptIcon className="size-4" aria-hidden="true" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
