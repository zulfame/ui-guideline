import { createContext, useContext } from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const bubbleVariants = cva(
  "w-fit max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        muted: "bg-muted text-muted-foreground",
        tinted: "bg-primary/10 text-foreground",
        outline: "border bg-background text-foreground",
        ghost: "max-w-full bg-transparent px-0 py-0 text-foreground",
        destructive: "bg-destructive text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const BubbleContext = createContext({ variant: "default" });

function BubbleGroup({ className, ...props }) {
  return (
    <div
      data-slot="bubble-group"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function Bubble({ className, variant = "default", align = "start", ...props }) {
  return (
    <BubbleContext.Provider value={{ variant }}>
      <div
        data-slot="bubble"
        data-align={align}
        className={cn("flex w-full", align === "end" && "justify-end", className)}
        {...props}
      />
    </BubbleContext.Provider>
  );
}

function BubbleContent({ className, ...props }) {
  const { variant } = useContext(BubbleContext);
  return (
    <div
      data-slot="bubble-content"
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  );
}

function BubbleReactions({ className, side = "bottom", align = "end", ...props }) {
  return (
    <div
      data-slot="bubble-reactions"
      data-side={side}
      className={cn(
        "flex w-fit items-center gap-1 rounded-full border bg-background px-1.5 py-0.5 text-xs shadow-sm",
        align === "end" ? "ml-auto" : "mr-auto",
        className,
      )}
      {...props}
    />
  );
}

export {
  Bubble,
  BubbleGroup,
  BubbleContent,
  BubbleReactions,
  bubbleVariants,
};
