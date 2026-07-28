import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const attachmentVariants = cva(
  "relative flex gap-3 rounded-lg border bg-card p-3 text-card-foreground",
  {
    variants: {
      size: {
        default: "p-3 gap-3",
        sm: "p-2 gap-2 text-sm",
        xs: "p-1.5 gap-2 text-xs",
      },
      orientation: {
        horizontal: "items-center",
        vertical: "flex-col items-stretch",
      },
      state: {
        idle: "",
        uploading: "",
        processing: "",
        error: "border-destructive/50",
        done: "",
      },
    },
    defaultVariants: {
      size: "default",
      orientation: "horizontal",
      state: "done",
    },
  },
);

function Attachment({
  className,
  size = "default",
  orientation = "horizontal",
  state = "done",
  ...props
}) {
  return (
    <div
      data-slot="attachment"
      data-state={state}
      data-size={size}
      data-orientation={orientation}
      className={cn(attachmentVariants({ size, orientation, state }), className)}
      {...props}
    />
  );
}

function AttachmentMedia({ className, variant = "icon", ...props }) {
  return (
    <div
      data-slot="attachment-media"
      data-variant={variant}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground",
        variant === "icon" ? "size-10 [&_svg]:size-5" : "size-14 [&_img]:size-full [&_img]:object-cover",
        className,
      )}
      {...props}
    />
  );
}

function AttachmentContent({ className, ...props }) {
  return (
    <div
      data-slot="attachment-content"
      className={cn("flex min-w-0 flex-1 flex-col justify-center", className)}
      {...props}
    />
  );
}

function AttachmentTitle({ className, ...props }) {
  return (
    <div
      data-slot="attachment-title"
      className={cn("truncate font-medium leading-tight", className)}
      {...props}
    />
  );
}

function AttachmentDescription({ className, ...props }) {
  return (
    <div
      data-slot="attachment-description"
      className={cn("truncate text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function AttachmentActions({ className, ...props }) {
  return (
    <div
      data-slot="attachment-actions"
      className={cn("relative z-10 ml-auto flex shrink-0 items-center gap-1", className)}
      {...props}
    />
  );
}

function AttachmentAction({ className, variant = "ghost", ...props }) {
  return (
    <Button
      data-slot="attachment-action"
      variant={variant}
      size="icon"
      className={cn("size-7 [&_svg]:size-4", className)}
      {...props}
    />
  );
}

function AttachmentTrigger({ className, render, ...props }) {
  const classes = cn(
    "absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    className,
  );
  if (render) {
    return render({ "data-slot": "attachment-trigger", className: classes, ...props });
  }
  return (
    <button
      type="button"
      data-slot="attachment-trigger"
      className={classes}
      {...props}
    />
  );
}

function AttachmentGroup({ className, ...props }) {
  return (
    <div
      data-slot="attachment-group"
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 [&>*]:snap-start snap-x",
        className,
      )}
      {...props}
    />
  );
}

export {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentTrigger,
  AttachmentGroup,
  attachmentVariants,
};
