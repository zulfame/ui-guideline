import { ChevronDown, Rows3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDensity } from "@/components/density-provider";

const OPTIONS = [
  { value: "dense", label: "Dense" },
  { value: "comfortable", label: "Comfortable" },
];

/** DensityToggle — global Dense / Comfortable UI density (mirrors sample "Density" dropdown). */
export function DensityToggle() {
  const { density, setDensity } = useDensity();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="density-toggle-trigger"
          aria-label="Toggle density"
        >
          <Rows3 className="size-4" /> Density
          <ChevronDown className="size-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>UI density</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={density} onValueChange={setDensity}>
          {OPTIONS.map(({ value, label }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              data-testid={`density-option-${value}`}
            >
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
