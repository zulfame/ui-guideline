/**
 * Data display / formatting helpers (Registry 2C.20).
 * Display conventions only — locale defaults to en-US; consumers may override.
 * Nil values (null/undefined/"") render as an em dash "—".
 */
const DASH = "\u2014";
const isNil = (v) => v === null || v === undefined || v === "";

export function formatNumber(value, options) {
  if (isNil(value)) return DASH;
  return new Intl.NumberFormat("en-US", options).format(value);
}

export function formatCurrency(value, currency = "USD") {
  if (isNil(value)) return DASH;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export function formatPercent(value, digits = 1) {
  if (isNil(value)) return DASH;
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDate(value) {
  if (isNil(value)) return DASH;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatTime(value) {
  if (isNil(value)) return DASH;
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatRelative(value) {
  if (isNil(value)) return DASH;
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (Math.abs(mins) < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Map a status label to a canonical Badge variant (monochrome-first). */
export function statusBadgeVariant(status) {
  const map = {
    Active: "default",
    Inactive: "outline",
    Pending: "secondary",
    Error: "destructive",
  };
  return map[status] ?? "secondary";
}
