import { useLocation } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { getBreadcrumb } from "@/config/navigation";

/**
 * PlaceholderPage
 * Reusable blank page. Derives its title from the current route via the nav
 * config, so newly added routes get a consistent header with no extra files.
 */
export default function PlaceholderPage() {
  const { pathname } = useLocation();
  const { title } = getBreadcrumb(pathname);

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description="This page is intentionally blank for now."
      />
    </div>
  );
}
