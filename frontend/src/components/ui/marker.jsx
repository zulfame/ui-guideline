import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const markerVariants = cva(
  "flex items-center gap-2 text-xs font-medium text-muted-foreground",
  {
    variants: {
      variant: {
        default: "",
        border: "border-b pb-2",
        separator:
          "gap-3 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Marker({ className, variant = "default", ...props }) {
  return (
    <div
      data-slot="marker"
      data-variant={variant}
      className={cn(markerVariants({ variant }), className)}
      {...props}
    />
  );
}

function MarkerIcon({ className, ...props }) {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      className={cn("flex shrink-0 items-center [&_svg]:size-3.5", className)}
      {...props}
    />
  );
}

function MarkerContent({ className, ...props }) {
  return (
    <span
      data-slot="marker-content"
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

export { Marker, MarkerIcon, MarkerContent, markerVariants };
