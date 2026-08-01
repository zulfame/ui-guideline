import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ChevronsUpDown,
  Check,
  BadgeCheck,
  Settings,
  LogOut,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { navAreas, getAreaIdForPath, getArea, getAreaDefaultPath } from "@/config/navigation";
import { useBranding } from "@/context/BrandingContext";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/context/AuthContext";
import { LOGOUT } from "@/constants/testIds/auth";

// Derive avatar initials from a user's name or email.
const _initials = (name, email) => ((name || email || "U").trim().slice(0, 1) || "U").toUpperCase();

/**
 * AppSidebar
 * shadcn sidebar-07 pattern (collapse-to-icons) with an area-switcher header
 * (Application / Design System). The active area is derived from the current
 * route; switching navigates to the area's default page. Grouped sections and
 * collapsible submenus are wired to React Router navigation.
 */
export const AppSidebar = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useSidebar();

  const activeAreaId = getAreaIdForPath(location.pathname);
  const activeArea = getArea(activeAreaId);
  const ActiveAreaIcon = activeArea.icon;

  // Branding overrides the "Application" area identity (name, tagline, logo).
  const { branding, assetUrl } = useBranding();
  const { theme } = useTheme();
  const { user, logout, isAdmin } = useAuth();
  const currentUser = {
    name: user?.name || "User",
    email: user?.email || user?.username || "",
    initials: _initials(user?.name, user?.email),
  };
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const isApp = activeAreaId === "application";
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const brandName = isApp && branding?.app_name ? branding.app_name : activeArea.label;
  const brandTagline = isApp ? branding?.tagline || activeArea.tagline : activeArea.tagline;
  const brandLogo = isApp
    ? isDark
      ? assetUrl("logo_dark") || assetUrl("logo_light")
      : assetUrl("logo_light") || assetUrl("logo_dark")
    : null;

  const isActive = (to, end) =>
    end ? location.pathname === to : location.pathname.startsWith(to);

  const hasActiveChild = (item) =>
    item.children?.some((child) => location.pathname === child.to);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="sticky top-0 z-10 border-b border-sidebar-border bg-sidebar">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  data-testid="area-switcher-trigger"
                >
                  {brandLogo ? (
                    <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg border">
                      <img src={brandLogo} alt="" className="size-8 object-contain" />
                    </div>
                  ) : (
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <ActiveAreaIcon className="size-4" aria-hidden="true" />
                    </div>
                  )}
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {brandName}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {brandTagline}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Areas
                </DropdownMenuLabel>
                {navAreas.map((area) => {
                  const AreaIcon = area.icon;
                  return (
                    <DropdownMenuItem
                      key={area.id}
                      className="gap-2 p-2"
                      onClick={() => navigate(getAreaDefaultPath(area.id))}
                      data-testid={`area-switcher-${area.id}`}
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border">
                        <AreaIcon className="size-3.5 shrink-0" aria-hidden="true" />
                      </div>
                      <span className="flex-1">{area.label}</span>
                      {area.id === activeAreaId ? (
                        <Check className="size-4" aria-hidden="true" />
                      ) : null}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {activeArea.sections.map((section) => {
          const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;
          return (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const Icon = item.icon;

                if (item.children) {
                  return (
                    <Collapsible
                      key={item.title}
                      asChild
                      defaultOpen={hasActiveChild(item)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.title}>
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
                              <SidebarMenuSubItem key={child.to}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={location.pathname === child.to}
                                >
                                  <Link to={child.to}>
                                    <span>{child.title}</span>
                                  </Link>
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
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.to, item.end)}
                      tooltip={item.title}
                    >
                      <Link to={item.to}>
                        {Icon ? <Icon aria-hidden="true" /> : null}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="border border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground shadow-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xs">
                      {currentUser.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {currentUser.name}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {currentUser.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg text-xs">
                        {currentUser.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {currentUser.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {currentUser.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => navigate("/account")}
                    data-testid="user-menu-account"
                  >
                    <BadgeCheck aria-hidden="true" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/settings")}
                    data-testid="user-menu-settings"
                  >
                    <Settings aria-hidden="true" />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid={LOGOUT.button}>
                  <LogOut aria-hidden="true" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
