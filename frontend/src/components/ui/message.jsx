import { cn } from "@/lib/utils";

function MessageGroup({ className, ...props }) {
  return (
    <div
      data-slot="message-group"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function Message({ className, align = "start", ...props }) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn(
        "flex w-full items-end gap-2",
        align === "end" &&
          "flex-row-reverse [&_[data-slot=message-content]]:items-end",
        className,
      )}
      {...props}
    />
  );
}

function MessageAvatar({ className, ...props }) {
  return (
    <div
      data-slot="message-avatar"
      className={cn("shrink-0 self-end", className)}
      {...props}
    />
  );
}

function MessageContent({ className, ...props }) {
  return (
    <div
      data-slot="message-content"
      className={cn("flex max-w-[75%] flex-col gap-1", className)}
      {...props}
    />
  );
}

function MessageHeader({ className, ...props }) {
  return (
    <div
      data-slot="message-header"
      className={cn("text-muted-foreground text-xs font-medium", className)}
      {...props}
    />
  );
}

function MessageFooter({ className, ...props }) {
  return (
    <div
      data-slot="message-footer"
      className={cn("text-muted-foreground text-xs", className)}
      {...props}
    />
  );
}

export {
  Message,
  MessageGroup,
  MessageAvatar,
  MessageContent,
  MessageHeader,
  MessageFooter,
};
