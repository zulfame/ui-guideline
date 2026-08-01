import {
  LayoutDashboard,
  Component,
  Blocks,
  BarChart3,
  LayoutTemplate,
  Palette,
  LayoutGrid,
  Shapes,
  Users,
  ShieldCheck,
  Building2,
  BookOpenCheck,
  KeyRound,
  Paintbrush,
  Radio,
  Database,
  ScrollText,
  ShieldAlert,
  Mail,
} from "lucide-react";

import { guidelineGroups } from "./developmentGuidelines";

/**
 * Central navigation config — organized into top-level AREAS shown via the
 * sidebar area-switcher (Application / Design System).
 * Each area has sections (label + items). An item may be a direct link (`to`)
 * or a collapsible group with `children`. Single source for sidebar + breadcrumb.
 */
export const navAreas = [
  {
    id: "application",
    label: "Application",
    tagline: "Management CMS",
    icon: LayoutGrid,
    sections: [
      {
        label: "General",
        items: [
          { title: "Dashboard", to: "/", icon: LayoutDashboard, end: true },
        ],
      },
      {
        label: "Manage",
        items: [
          { title: "Users", to: "/users", icon: Users },
          { title: "Roles", to: "/roles", icon: ShieldCheck },
          { title: "Offices", to: "/offices", icon: Building2 },
          { title: "Clients", to: "/clients", icon: KeyRound, adminOnly: true },
        ],
      },
      {
        label: "System",
        items: [
          { title: "Audit Log", to: "/audit-log", icon: ScrollText },
          { title: "Branding", to: "/branding", icon: Paintbrush, adminOnly: true },
          { title: "Broadcast", to: "/broadcast", icon: Radio, adminOnly: true },
          { title: "Database", to: "/database", icon: Database, adminOnly: true },
          { title: "Security", to: "/login-security", icon: ShieldAlert, adminOnly: true },
          { title: "Templates", to: "/email-templates", icon: Mail, adminOnly: true },
        ],
      },
    ],
  },
  {
    id: "design-system",
    label: "Design System",
    tagline: "Components & Tokens",
    icon: Shapes,
    sections: [
      {
        label: "Design System",
        items: [
          { title: "Design Tokens", to: "/design-system/tokens", icon: Palette },
          { title: "Components", to: "/design-system/components", icon: Component },
          {
            title: "Sample Blocks",
            icon: Blocks,
            children: [
              { title: "Sidebar", to: "/design-system/blocks/sidebar" },
              { title: "Login", to: "/design-system/blocks/login" },
              { title: "Forgot", to: "/design-system/blocks/forgot" },
              { title: "Profile", to: "/design-system/blocks/profile" },
              { title: "Wizard", to: "/design-system/blocks/wizard" },
              { title: "Empty States", to: "/design-system/blocks/empty-states" },
              { title: "Permissions", to: "/design-system/blocks/permissions" },
              { title: "Data Display", to: "/design-system/blocks/data-display" },
            ],
          },
          {
            title: "Sample Charts",
            icon: BarChart3,
            children: [
              { title: "Area Charts", to: "/design-system/charts/area" },
              { title: "Bar Charts", to: "/design-system/charts/bar" },
              { title: "Line Charts", to: "/design-system/charts/line" },
              { title: "Pie Charts", to: "/design-system/charts/pie" },
              { title: "Radar Charts", to: "/design-system/charts/radar" },
              { title: "Radial Charts", to: "/design-system/charts/radial" },
              { title: "Tooltips", to: "/design-system/charts/tooltips" },
            ],
          },
          {
            title: "Sample Layout",
            icon: LayoutTemplate,
            children: [
              { title: "DataTable", to: "/design-system/layouts/datatable" },
              { title: "Form Elements", to: "/design-system/layouts/form-elements" },
              { title: "Form Layout", to: "/design-system/layouts/form-layout" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "development",
    label: "Dev Guidelines",
    tagline: "Engineering Standards",
    icon: BookOpenCheck,
    sections: [
      {
        label: "Dev Guidelines",
        items: [
          {
            title: "Dev Guidelines",
            to: "/dev-guidelines",
            icon: LayoutDashboard,
            end: true,
          },
          ...guidelineGroups.map((group) => ({
            title: group.title,
            to: `/dev-guidelines/${group.id}`,
            icon: group.icon,
          })),
        ],
      },
    ],
  },
];

/** Backward-compatible flat sections (used by the Sidebar sample block preview). */
export const navSections = navAreas.flatMap((area) => area.sections);

/** Flat list of every routable nav path (for router generation). */
export const navRoutes = navAreas.flatMap((area) =>
  area.sections.flatMap((section) =>
    section.items.flatMap((item) =>
      item.children ? item.children.map((c) => c.to) : [item.to],
    ),
  ),
);

/** Which area a pathname belongs to (route-derived active area). */
export const getAreaIdForPath = (pathname) => {
  if (pathname.startsWith("/design-system")) return "design-system";
  if (pathname.startsWith("/dev-guidelines")) return "development";
  return "application";
};

/** Resolve an area by id (falls back to the first area). */
export const getArea = (id) =>
  navAreas.find((area) => area.id === id) ?? navAreas[0];

/** First navigable path of an area (target when switching areas). */
export const getAreaDefaultPath = (id) => {
  const first = getArea(id).sections[0]?.items[0];
  if (!first) return "/";
  return first.children ? first.children[0].to : first.to;
};

/**
 * Resolve breadcrumb trail + page title for a pathname.
 * Returns { title, trail: string[] }.
 */
export const getBreadcrumb = (pathname) => {
  for (const area of navAreas) {
    for (const section of area.sections) {
      for (const item of section.items) {
        if (item.children) {
          for (const child of item.children) {
            if (pathname === child.to) {
              return {
                title: child.title,
                trail: [section.label, item.title, child.title],
              };
            }
          }
        } else if (item.to === pathname) {
          const trail =
            item.to === "/" ? [item.title] : [section.label, item.title];
          return { title: item.title, trail };
        }
      }
    }
  }
  const subRoutes = [
    { re: /^\/users\/new$/, parent: "/users", title: "Add User" },
    { re: /^\/users\/[^/]+\/edit$/, parent: "/users", title: "Edit User" },
  ];
  for (const sr of subRoutes) {
    if (sr.re.test(pathname)) {
      const base = getBreadcrumb(sr.parent);
      return { title: sr.title, trail: [...base.trail, sr.title] };
    }
  }
  const accountTitle = { "/account": "Account", "/settings": "Settings" }[pathname];
  if (accountTitle) return { title: accountTitle, trail: ["Application", accountTitle] };
  return { title: "Page", trail: ["Page"] };
};
