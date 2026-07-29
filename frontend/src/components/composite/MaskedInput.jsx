import { IMaskInput } from "react-imask";

import { Label } from "@/components/ui/label";

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function MaskedInput() {
  return (
    <div className="w-full max-w-xs space-y-4" data-testid="masked-input">
      <div className="space-y-1.5">
        <Label>Date</Label>
        <IMaskInput mask="00/00/0000" placeholder="MM/DD/YYYY" className={inputClass} />
      </div>
      <div className="space-y-1.5">
        <Label>Phone</Label>
        <IMaskInput
          mask="(000) 000-0000"
          placeholder="(___) ___-____"
          className={inputClass}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Card Number</Label>
        <IMaskInput
          mask="0000 0000 0000 0000"
          placeholder="0000 0000 0000 0000"
          className={inputClass}
        />
      </div>
    </div>
  );
}
