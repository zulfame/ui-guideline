import { Fragment } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { getBreadcrumb } from "@/config/navigation";

/**
 * AppLayout
 * Dashboard shell using the shadcn Sidebar system (sidebar-07, collapse-to-icon).
 * Sticky header (SidebarTrigger + breadcrumb trail). Pages render via <Outlet />.
 */
export const AppLayout = () => {
  const location = useLocation();
  const { trail } = getBreadcrumb(location.pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {trail.map((label, index) => {
                const isLast = index === trail.length - 1;
                return (
                  <Fragment key={`${label}-${index}`}>
                    <BreadcrumbItem className={isLast ? undefined : "hidden md:block"}>
                      {isLast ? (
                        <BreadcrumbPage>{label}</BreadcrumbPage>
                      ) : (
                        <span className="text-muted-foreground">{label}</span>
                      )}
                    </BreadcrumbItem>
                    {isLast ? null : (
                      <BreadcrumbSeparator className="hidden md:block" />
                    )}
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};
