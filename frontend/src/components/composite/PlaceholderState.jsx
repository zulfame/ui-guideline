import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function PlaceholderState() {
  return (
    <div className="w-full max-w-md" data-testid="placeholder-state">
      <Empty className="rounded-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>No Data Available</EmptyTitle>
          <EmptyDescription>
            Placeholder empty state. Create your first item to get started.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm">
            <Plus className="size-4" /> Add Item
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
