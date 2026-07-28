import { LayoutDashboard, Component, Blocks, BarChart3 } from "lucide-react";

/**
 * Central navigation config for the dashboard.
 * Single source so sidebar (desktop + mobile) and breadcrumb stay in sync.
 * `end: true` means the route must match exactly (used for the index route).
 */
export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dashboard/components", label: "Components", icon: Component },
  { to: "/dashboard/blocks", label: "Blocks", icon: Blocks },
  { to: "/dashboard/charts", label: "Charts", icon: BarChart3 },
];

/** Resolve the active nav item for a given pathname. */
export const getActiveNavItem = (pathname) =>
  [...navItems]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) =>
      item.end ? pathname === item.to : pathname.startsWith(item.to),
    );
