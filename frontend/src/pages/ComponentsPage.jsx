import { useState } from "react";
import { Eye } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { componentPreviews } from "@/config/componentPreviews";
import { compositePreviews } from "@/config/compositePreviews";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Unified component catalog: Base (shadcn/ui primitives) + Composite (reusable
 * patterns), merged and sorted A–Z. `kind` marks the source; `status` follows the
 * Design System legend (established ✅ / available ⚪ / pending 🔒).
 */
const BASE_NAMES = [
  "Accordion", "Alert", "Alert Dialog", "Aspect Ratio", "Attachment", "Avatar",
  "Badge", "Breadcrumb", "Bubble", "Button", "Button Group", "Calendar", "Card",
  "Carousel", "Chart", "Checkbox", "Collapsible", "Combobox", "Command",
  "Context Menu", "Data Table", "Date Picker", "Dialog", "Drawer",
  "Dropdown Menu", "Empty", "Field", "Hover Card", "Input", "Input Group",
  "Input OTP", "Item", "Kbd", "Label", "Marker", "Menubar", "Message",
  "Message Scroller", "Native Select", "Navigation Menu", "Pagination", "Popover",
  "Progress", "Radio Group", "Resizable", "Scroll Area", "Select", "Separator",
  "Sheet", "Sidebar", "Skeleton", "Slider", "Spinner", "Switch", "Table", "Tabs",
  "Textarea", "Toast", "Toggle", "Toggle Group", "Tooltip", "Typography",
];

const COMPOSITE_NAMES = [
  "Autocomplete", "Rating", "Stepper", "List", "Cookie Banner", "Preloader",
  "Widget", "Placeholder", "Data Grid", "Code Block", "Markdown", "Phone Input",
  "Input Mask", "Kanban", "Sortable",
];

const components = [
  ...BASE_NAMES.map((name) => ({ name, status: "established", kind: "Base" })),
  ...COMPOSITE_NAMES.map((name) => ({ name, status: "established", kind: "Composite" })),
].sort((a, b) => a.name.localeCompare(b.name));

const STATUS_META = {
  established: { label: "Established", variant: "default" },
  available: { label: "Available", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
};

function getPreview(item) {
  if (!item) return null;
  return item.kind === "Composite"
    ? compositePreviews[item.name]
    : componentPreviews[item.name];
}

export default function ComponentsPage() {
  const [preview, setPreview] = useState(null);
  const previewNode = getPreview(preview);

  return (
    <div className="space-y-6" data-testid="components-page">
      <PageHeader
        title="Components"
        description="All design-system components — Base (shadcn/ui) and Composite patterns, sorted A–Z."
      />

      <Card data-testid="table-card">
        <CardHeader>
          <CardTitle className="text-base">Table</CardTitle>
          <CardDescription>
            A data table wrapped in a card, listing every component with its type
            and design-system status. Total: {components.length}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table data-testid="data-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead className="w-40">Status</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-muted-foreground"
                      data-testid="table-empty-state"
                    >
                      No Data Available
                    </TableCell>
                  </TableRow>
                ) : (
                  components.map((item, index) => {
                    const meta = STATUS_META[item.status];
                    return (
                      <TableRow
                        key={`${item.kind}-${item.name}`}
                        data-testid={`table-row-${index + 1}`}
                      >
                        <TableCell className="text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.kind === "Composite" ? "outline" : "secondary"}
                            data-testid={`type-badge-${index + 1}`}
                          >
                            {item.kind}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={meta.variant}
                            data-testid={`status-badge-${index + 1}`}
                          >
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            aria-label={`Preview ${item.name}`}
                            data-testid={`preview-button-${index + 1}`}
                            onClick={() => setPreview(item)}
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent data-testid="component-preview-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {preview?.name}
              {preview ? (
                <>
                  <Badge variant={preview.kind === "Composite" ? "outline" : "secondary"}>
                    {preview.kind}
                  </Badge>
                  <Badge variant={STATUS_META[preview.status].variant}>
                    {STATUS_META[preview.status].label}
                  </Badge>
                </>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              Live preview of the component as used in this design system.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4">
            <div
              className="flex min-h-[160px] items-center justify-center overflow-auto rounded-md border bg-background p-6"
              data-testid="component-preview-body"
            >
              {previewNode ?? (
                <p className="text-sm text-muted-foreground">
                  This component is not yet available in the design system.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
