import {
  LayoutDashboard,
  Component,
  Blocks,
  BarChart3,
  LayoutTemplate,
  Palette,
} from "lucide-react";

/**
 * Central navigation config.
 * Sections group items under a label. An item may be a direct link (`to`)
 * or a collapsible group with `children` (submenu links).
 * Single source for the sidebar and breadcrumb.
 */
export const navSections = [
  {
    label: "Greetings",
    items: [{ title: "Dashboard", to: "/", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Design System",
    items: [
      {
        title: "Design Tokens",
        to: "/design-system/tokens",
        icon: Palette,
      },
      {
        title: "Components",
        to: "/design-system/components",
        icon: Component,
      },
      {
        title: "Sample Blocks",
        icon: Blocks,
        children: [
          { title: "Sidebar", to: "/design-system/blocks/sidebar" },
          { title: "Login", to: "/design-system/blocks/login" },
          { title: "Forgot", to: "/design-system/blocks/forgot" },
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
];

/** Flat list of every routable nav path (for router generation). */
export const navRoutes = navSections.flatMap((section) =>
  section.items.flatMap((item) =>
    item.children ? item.children.map((c) => c.to) : [item.to],
  ),
);

/**
 * Resolve breadcrumb trail + page title for a pathname.
 * Returns { title, trail: string[] }.
 */
export const getBreadcrumb = (pathname) => {
  for (const section of navSections) {
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
          section.label.toLowerCase() === "greetings"
            ? [item.title]
            : [section.label, item.title];
        return { title: item.title, trail };
      }
    }
  }
  return { title: "Page", trail: ["Page"] };
};
