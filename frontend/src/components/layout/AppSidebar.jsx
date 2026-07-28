import { Link, useLocation } from "react-router-dom";
import { GalleryVerticalEnd } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { navItems } from "@/config/navigation";

/**
 * AppSidebar
 * Reusable sidebar content (brand + vertical nav), composed from shadcn
 * primitives. Rendered both in the fixed desktop rail and inside the mobile
 * Sheet. `onNavigate` lets the mobile drawer close on selection.
 */
export const AppSidebar = ({ onNavigate }) => {
  const location = useLocation();

  const isActive = (item) =>
    item.end
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to);

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GalleryVerticalEnd className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-sm font-semibold tracking-tight">
          UI Guidelines
        </span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Menu
        </p>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.to}
                asChild
                variant={isActive(item) ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 font-normal"
                onClick={onNavigate}
              >
                <Link to={item.to} aria-current={isActive(item) ? "page" : undefined}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </Button>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
};
