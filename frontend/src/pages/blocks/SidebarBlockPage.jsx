import { PageHeader } from "@/components/layout/PageHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * SidebarBlockPage
 * A self-contained PREVIEW of the sidebar-07 block (mirrors the shadcn blocks
 * preview panel). It reuses the current system's <AppSidebar /> as content, in
 * the non-fixed `collapsible="none"` variant so the sidebar is contained inside
 * the bordered frame (with a controlled height and the user footer visible).
 */
export default function SidebarBlockPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sidebar"
        description="A sidebar that collapses to icons — preview using the current system's sidebar content."
      />

      {/* Preview frame */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <SidebarProvider className="min-h-0 h-[600px]">
          <AppSidebar collapsible="none" className="border-r" />
          <SidebarInset className="min-h-0 bg-background">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-1 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">
                      Build Your Application
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>

            <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="aspect-video rounded-xl bg-muted/50" />
                <div className="aspect-video rounded-xl bg-muted/50" />
                <div className="aspect-video rounded-xl bg-muted/50" />
              </div>
              <div className="min-h-[400px] flex-1 rounded-xl bg-muted/50" />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
}
