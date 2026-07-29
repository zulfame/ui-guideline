import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ScrollerContext = createContext(null);

function MessageScroller({ className, children, autoScroll = true, ...props }) {
  const viewportRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);

  const scrollToEnd = () => {
    const vp = viewportRef.current;
    if (vp) vp.scrollTo({ top: vp.scrollHeight, behavior: "smooth" });
  };

  return (
    <ScrollerContext.Provider
      value={{ viewportRef, atBottom, setAtBottom, scrollToEnd, autoScroll }}
    >
      <div
        data-slot="message-scroller"
        data-scrollable={!atBottom}
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-lg border bg-background",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </ScrollerContext.Provider>
  );
}

const MessageScrollerViewport = forwardRef(function MessageScrollerViewport(
  { className, onScroll, ...props },
  ref,
) {
  const { viewportRef, setAtBottom } = useContext(ScrollerContext);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setAtBottom(bottom);
    onScroll?.(e);
  };

  return (
    <div
      ref={(node) => {
        viewportRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      role="region"
      aria-label="Messages"
      tabIndex={0}
      data-slot="message-scroller-viewport"
      onScroll={handleScroll}
      className={cn("flex-1 overflow-y-auto p-4", className)}
      {...props}
    />
  );
});

function MessageScrollerContent({ className, ...props }) {
  const { viewportRef, autoScroll, atBottom } = useContext(ScrollerContext);

  useEffect(() => {
    if (autoScroll && atBottom && viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  });

  return (
    <div
      role="log"
      aria-relevant="additions"
      data-slot="message-scroller-content"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  );
}

function MessageScrollerItem({ className, ...props }) {
  return (
    <div
      data-slot="message-scroller-item"
      className={cn("", className)}
      {...props}
    />
  );
}

function MessageScrollerButton({ className, ...props }) {
  const { atBottom, scrollToEnd } = useContext(ScrollerContext);
  return (
    <Button
      size="icon"
      variant="secondary"
      onClick={scrollToEnd}
      data-active={!atBottom}
      data-slot="message-scroller-button"
      className={cn(
        "absolute bottom-4 right-4 size-9 rounded-full border shadow-md transition-opacity",
        atBottom && "pointer-events-none opacity-0",
        className,
      )}
      {...props}
    >
      <ArrowDown className="size-4" />
    </Button>
  );
}

export {
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
};
