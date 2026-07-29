import { FilterX, Plus, RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/composite/EmptyState";

const ITEMS = [
  {
    key: "no-data",
    label: "No Data",
    variant: "no-data",
    action: (
      <Button size="sm">
        <Plus className="size-4" /> Add item
      </Button>
    ),
  },
  {
    key: "no-results",
    label: "No Search Result",
    variant: "no-results",
    action: (
      <Button variant="outline" size="sm">
        <FilterX className="size-4" /> Clear filters
      </Button>
    ),
  },
  {
    key: "first-time",
    label: "First-Time / Onboarding",
    variant: "first-time",
    action: (
      <Button size="sm">
        <Plus className="size-4" /> Create your first item
      </Button>
    ),
  },
  { key: "forbidden", label: "Permission Denied", variant: "forbidden" },
  {
    key: "offline",
    label: "Offline",
    variant: "offline",
    action: (
      <Button variant="outline" size="sm">
        <RefreshCw className="size-4" /> Retry
      </Button>
    ),
  },
  {
    key: "error",
    label: "Error",
    variant: "error",
    action: (
      <Button variant="outline" size="sm">
        <RefreshCw className="size-4" /> Try again
      </Button>
    ),
  },
];

export default function EmptyStatesBlockPage() {
  return (
    <div className="space-y-6" data-testid="empty-states-block-page">
      <PageHeader
        title="Empty States"
        description="Classified empty-state patterns — data, search, onboarding, permission, offline and error."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it) => (
          <Card key={it.key} data-testid={`es-card-${it.key}`}>
            <CardHeader>
              <CardTitle className="text-base">{it.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState variant={it.variant} action={it.action} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
