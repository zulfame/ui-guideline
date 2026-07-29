import { useState } from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function Rating({ max = 5, defaultValue = 3 }) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1" data-testid="rating">
      {Array.from({ length: max }).map((_, i) => {
        const n = i + 1;
        const active = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            aria-label={`Rate ${n} of ${max}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setValue(n)}
            className="rounded-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className={cn(
                "size-6",
                active ? "fill-primary text-primary" : "text-muted-foreground/40",
              )}
            />
          </button>
        );
      })}
      <span className="ml-2 text-sm text-muted-foreground">
        {value}/{max}
      </span>
    </div>
  );
}
