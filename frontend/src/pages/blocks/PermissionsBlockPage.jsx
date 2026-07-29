import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmptyState } from "@/components/composite/EmptyState";

const ROLES = ["Admin", "Member", "Viewer"];

export default function PermissionsBlockPage() {
  const [role, setRole] = useState("Admin");
  const isAdmin = role === "Admin";
  const isViewer = role === "Viewer";

  return (
    <div className="space-y-6" data-testid="permissions-block-page">
      <PageHeader
        title="Permissions"
        description="Permission-aware UI strategies — hide, disable, read-only and forbidden."
      />

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Current role</CardTitle>
            <CardDescription>Switch role to see each strategy react.</CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={role}
            onValueChange={(v) => v && setRole(v)}
            variant="outline"
            data-testid="perm-role-toggle"
          >
            {ROLES.map((r) => (
              <ToggleGroupItem key={r} value={r} data-testid={`perm-role-${r.toLowerCase()}`}>
                {r}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardHeader>
      </Card>

      <TooltipProvider>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Hide */}
          <Card data-testid="perm-hide">
            <CardHeader>
              <CardTitle className="text-base">Hide</CardTitle>
              <CardDescription>Element is not rendered for unauthorized roles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAdmin ? (
                <Button variant="destructive" size="sm" data-testid="perm-hide-action">
                  <Trash2 className="size-4" /> Delete workspace
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Hidden for{" "}
                  <span className="font-medium text-foreground">{role}</span> — the
                  action leaves no trace in the DOM.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Disable */}
          <Card data-testid="perm-disable">
            <CardHeader>
              <CardTitle className="text-base">Disable</CardTitle>
              <CardDescription>Visible but locked, with a tooltip explaining why.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="inline-block">
                    <Button size="sm" disabled={!isAdmin} data-testid="perm-disable-action">
                      <UserPlus className="size-4" /> Invite members
                    </Button>
                  </span>
                </TooltipTrigger>
                {!isAdmin && <TooltipContent>Requires the Admin role.</TooltipContent>}
              </Tooltip>
            </CardContent>
          </Card>

          {/* Read-only */}
          <Card data-testid="perm-readonly">
            <CardHeader>
              <CardTitle className="text-base">Read-only</CardTitle>
              <CardDescription>Value is visible but not editable for Viewer.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="perm-name">Workspace name</Label>
                <Input
                  id="perm-name"
                  defaultValue="Acme Workspace"
                  readOnly={isViewer}
                  className={cn(isViewer && "bg-muted/50 cursor-default")}
                  data-testid="perm-readonly-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Forbidden */}
          <Card data-testid="perm-forbidden">
            <CardHeader>
              <CardTitle className="text-base">Forbidden</CardTitle>
              <CardDescription>Entire section is gated behind permission.</CardDescription>
            </CardHeader>
            <CardContent>
              {isViewer ? (
                <EmptyState variant="forbidden" testid="perm-forbidden-empty" />
              ) : (
                <div
                  className="rounded-md border border-border p-4 text-sm text-muted-foreground"
                  data-testid="perm-forbidden-content"
                >
                  Sensitive section content visible to{" "}
                  <span className="font-medium text-foreground">{role}</span>.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </div>
  );
}
