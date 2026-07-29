/**
 * Generic sample/mock data for Sample Layout & Blocks pages.
 * Kept out of page components (separation of concerns) — placeholder content only.
 */

export const USER_ROLES = ["Admin", "Member", "Viewer"];
export const USER_STATUSES = ["Active", "Inactive"];

/** DataTable layout — 24 generic users. */
export const SAMPLE_USERS = Array.from({ length: 24 }).map((_, i) => ({
  id: i + 1,
  name: `Item ${i + 1}`,
  email: `item${i + 1}@example.com`,
  role: USER_ROLES[i % 3],
  status: i % 4 === 0 ? "Inactive" : "Active",
}));

/** Data Display block — rows exercising each formatting rule (incl. nil values). */
export const SAMPLE_DISPLAY_ROWS = [
  {
    id: 1,
    name: "Item 1",
    amount: 1250.5,
    growth: 0.128,
    units: 3420,
    created: "2026-01-14",
    active: "2026-06-02T09:24:00",
    status: "Active",
  },
  {
    id: 2,
    name: "Item 2",
    amount: -320,
    growth: -0.045,
    units: 0,
    created: "2025-11-30",
    active: "2026-05-28T17:03:00",
    status: "Inactive",
  },
  {
    id: 3,
    name: "Item 3",
    amount: null,
    growth: null,
    units: null,
    created: null,
    active: null,
    status: "Pending",
  },
];
