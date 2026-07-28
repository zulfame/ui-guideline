import { useState } from "react";
import {
  GalleryVerticalEnd,
  ChevronRight,
  ChevronsUpDown,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
import { navSections } from "@/config/navigation";

/**
 * SidebarBlockPage
 * A self-contained PREVIEW of the sidebar-07 block (mirrors the shadcn blocks
 * preview panel). Reuses the real navigation structure (`navSections`) but is
 * fully inert: menu clicks only update local selection + render a blank
 * placeholder inside the frame — they never navigate the host system.
 */
export default function SidebarBlockPage() {
  // Local selection: [sectionLabel, itemTitle, childTitle?]
  const [active, setActive] = useState(["Greetings", "Dashboard"]);

  const isItemActive = (sectionLabel, itemTitle) =>
    active[0] === sectionLabel && active[1] === itemTitle && !active[2];

  const isChildActive = (sectionLabel, itemTitle, childTitle) =>
    active[0] === sectionLabel &&
    active[1] === itemTitle &&
    active[2] === childTitle;

  const hasActiveChild = (sectionLabel, item) =>
    active[0] === sectionLabel &&
    active[1] === item.title &&
    Boolean(active[2]);

  // Breadcrumb trail from the current selection (Greetings collapses to title only).
  const trail =
    active[0].toLowerCase() === "greetings"
      ? [active[1]]
      : active.slice(0, active[2] ? 3 : 2);

  return (
    <div className="space-y-6" data-testid="sidebar-block-page">
      <PageHeader
        title="Sidebar"
        description="A sidebar that collapses to icons — preview using the current system's sidebar content."
      />

      {/* Preview frame — fully self-contained, no host navigation */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <SidebarProvider className="min-h-0 h-[600px]">
          <Sidebar collapsible="none" className="border-r">
            <SidebarHeader className="border-b border-sidebar-border">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <GalleryVerticalEnd className="size-4" aria-hidden="true" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        UI Guidelines
                      </span>
                      <span className="truncate text-xs text-sidebar-foreground/70">
                        Enterprise
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
              {navSections.map((section) => (
                <SidebarGroup key={section.label}>
                  <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                  <SidebarMenu>
                    {section.items.map((item) => {
                      const Icon = item.icon;

                      if (item.children) {
                        return (
                          <Collapsible
                            key={item.title}
                            asChild
                            defaultOpen={hasActiveChild(section.label, item)}
                            className="group/collapsible"
                          >
                            <SidebarMenuItem>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton>
                                  {Icon ? <Icon aria-hidden="true" /> : null}
                                  <span>{item.title}</span>
                                  <ChevronRight
                                    className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                                    aria-hidden="true"
                                  />
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {item.children.map((child) => (
                                    <SidebarMenuSubItem key={child.title}>
                                      <SidebarMenuSubButton
                                        isActive={isChildActive(
                                          section.label,
                                          item.title,
                                          child.title,
                                        )}
                                        onClick={() =>
                                          setActive([
                                            section.label,
                                            item.title,
                                            child.title,
                                          ])
                                        }
                                      >
                                        <span>{child.title}</span>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuItem>
                          </Collapsible>
                        );
                      }

                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            isActive={isItemActive(section.label, item.title)}
                            onClick={() =>
                              setActive([section.label, item.title])
                            }
                          >
                            {Icon ? <Icon aria-hidden="true" /> : null}
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroup>
              ))}
            </SidebarContent>

            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    size="lg"
                    className="border border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg text-xs">
                        U
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">User</span>
                      <span className="truncate text-xs text-sidebar-foreground/70">
                        user@example.com
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="min-h-0 bg-background">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-1 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  {trail.map((label, index) => {
                    const isLast = index === trail.length - 1;
                    return (
                      <span key={`${label}-${index}`} className="contents">
                        <BreadcrumbItem
                          className={isLast ? undefined : "hidden md:block"}
                        >
                          {isLast ? (
                            <BreadcrumbPage>{label}</BreadcrumbPage>
                          ) : (
                            <span className="text-muted-foreground">
                              {label}
                            </span>
                          )}
                        </BreadcrumbItem>
                        {isLast ? null : (
                          <BreadcrumbSeparator className="hidden md:block" />
                        )}
                      </span>
                    );
                  })}
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
