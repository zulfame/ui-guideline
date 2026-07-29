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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * shadcn/ui "All Components" (source: https://ui.shadcn.com/docs/components).
 * `status` mengikuti legenda Design System:
 *  - "established" ✅ : sudah dipakai & distandarkan di sistem ini.
 *  - "available"   ⚪ : primitive tersedia di `components/ui/`, belum dipakai.
 *  - "pending"     🔒 : belum diport ke `components/ui/` (butuh keputusan/persetujuan).
 */
const components = [
  { name: "Accordion", status: "established" },
  { name: "Alert", status: "established" },
  { name: "Alert Dialog", status: "established" },
  { name: "Aspect Ratio", status: "established" },
  { name: "Attachment", status: "established" },
  { name: "Avatar", status: "established" },
  { name: "Badge", status: "established" },
  { name: "Breadcrumb", status: "established" },
  { name: "Bubble", status: "established" },
  { name: "Button", status: "established" },
  { name: "Button Group", status: "established" },
  { name: "Calendar", status: "established" },
  { name: "Card", status: "established" },
  { name: "Carousel", status: "established" },
  { name: "Chart", status: "established" },
  { name: "Checkbox", status: "established" },
  { name: "Collapsible", status: "established" },
  { name: "Combobox", status: "established" },
  { name: "Command", status: "established" },
  { name: "Context Menu", status: "established" },
  { name: "Data Table", status: "established" },
  { name: "Date Picker", status: "established" },
  { name: "Dialog", status: "established" },
  { name: "Drawer", status: "established" },
  { name: "Dropdown Menu", status: "established" },
  { name: "Empty", status: "established" },
  { name: "Field", status: "established" },
  { name: "Hover Card", status: "established" },
  { name: "Input", status: "established" },
  { name: "Input Group", status: "established" },
  { name: "Input OTP", status: "established" },
  { name: "Item", status: "established" },
  { name: "Kbd", status: "established" },
  { name: "Label", status: "established" },
  { name: "Marker", status: "established" },
  { name: "Menubar", status: "established" },
  { name: "Message", status: "established" },
  { name: "Message Scroller", status: "established" },
  { name: "Native Select", status: "established" },
  { name: "Navigation Menu", status: "established" },
  { name: "Pagination", status: "established" },
  { name: "Popover", status: "established" },
  { name: "Progress", status: "established" },
  { name: "Radio Group", status: "established" },
  { name: "Resizable", status: "established" },
  { name: "Scroll Area", status: "established" },
  { name: "Select", status: "established" },
  { name: "Separator", status: "established" },
  { name: "Sheet", status: "established" },
  { name: "Sidebar", status: "established" },
  { name: "Skeleton", status: "established" },
  { name: "Slider", status: "established" },
  { name: "Spinner", status: "established" },
  { name: "Switch", status: "established" },
  { name: "Table", status: "established" },
  { name: "Tabs", status: "established" },
  { name: "Textarea", status: "established" },
  { name: "Toast", status: "established" },
  { name: "Toggle", status: "established" },
  { name: "Toggle Group", status: "established" },
  { name: "Tooltip", status: "established" },
  { name: "Typography", status: "established" },
];

const STATUS_META = {
  established: { label: "Established", variant: "default" },
  available: { label: "Available", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
};

export default function ComponentsPage() {
  const [preview, setPreview] = useState(null);
  const previewNode = preview ? componentPreviews[preview.name] : null;

  return (
    <div className="space-y-6" data-testid="components-page">
      <PageHeader
        title="Base Components"
        description="Base components from shadcn/ui, adjusted to this design system."
      />

      <Card data-testid="table-card">
        <CardHeader>
          <CardTitle className="text-base">Table</CardTitle>
          <CardDescription>
            A data table wrapped in a card, listing all shadcn/ui components with
            their design-system availability status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table data-testid="data-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-40">Status</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
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
                        key={item.name}
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
                <Badge variant={STATUS_META[preview.status].variant}>
                  {STATUS_META[preview.status].label}
                </Badge>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              Live preview of the shadcn/ui component as used in this design
              system.
            </DialogDescription>
          </DialogHeader>

          <div
            className="flex min-h-[160px] items-center justify-center rounded-md border bg-background p-6"
            data-testid="component-preview-body"
          >
            {previewNode ?? (
              <p className="text-sm text-muted-foreground">
                This component is not yet available in the design system.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
