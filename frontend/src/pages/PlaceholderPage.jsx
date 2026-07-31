import { useLocation } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { getBreadcrumb } from "@/config/navigation";

/** Route-specific descriptions so blank pages still explain their future purpose. */
const DESCRIPTIONS = {
  "/clients": "Manage API client credentials — keys, secrets, and access scopes.",
  "/branding": "Manage application branding — name, logo, favicon, meta description, OG image, and visibility.",
  "/broadcast": "Manage broadcast channels such as Telegram, Discord, and others.",
  "/database": "Backup and restore the application database.",
  "/audit-log": "Review a log of all database and API activity.",
};

/**
 * PlaceholderPage
 * Reusable blank page. Derives its title from the current route via the nav
 * config, so newly added routes get a consistent header with no extra files.
 */
export default function PlaceholderPage() {
  const { pathname } = useLocation();
  const { title } = getBreadcrumb(pathname);

  return (
    <div className="space-y-6" data-testid="placeholder-page">
      <PageHeader
        title={title}
        description={DESCRIPTIONS[pathname] || "This page is intentionally blank for now."}
      />
    </div>
  );
}
