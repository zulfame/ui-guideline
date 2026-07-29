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
 * Composite Components: reusable patterns composed from Base (shadcn/ui)
 * primitives, plus a few approved dependencies. `dep` = external library used.
 */
const components = [
  { name: "Autocomplete", status: "established", dep: "—" },
  { name: "Rating", status: "established", dep: "—" },
  { name: "Stepper", status: "established", dep: "—" },
  { name: "List", status: "established", dep: "—" },
  { name: "Cookie Banner", status: "established", dep: "—" },
  { name: "Preloader", status: "established", dep: "—" },
  { name: "Widget", status: "established", dep: "—" },
  { name: "Placeholder", status: "established", dep: "—" },
  { name: "Data Grid", status: "established", dep: "@tanstack/react-table" },
  { name: "Code Block", status: "established", dep: "react-syntax-highlighter" },
  { name: "Markdown", status: "established", dep: "react-markdown" },
  { name: "Phone Input", status: "established", dep: "react-phone-number-input" },
  { name: "Input Mask", status: "established", dep: "react-imask" },
  { name: "Kanban", status: "established", dep: "@dnd-kit" },
  { name: "Sortable", status: "established", dep: "@dnd-kit" },
];

const STATUS_META = {
  established: { label: "Established", variant: "default" },
  available: { label: "Available", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
};

export default function CompositeComponentsPage() {
  const [preview, setPreview] = useState(null);
  const previewNode = preview ? compositePreviews[preview.name] : null;

  return (
    <div className="space-y-6" data-testid="composite-components-page">
      <PageHeader
        title="Composite Component"
        description="Reusable patterns composed from Base components, plus a few approved dependencies."
      />

      <Card data-testid="composite-table-card">
        <CardHeader>
          <CardTitle className="text-base">Table</CardTitle>
          <CardDescription>
            A data table wrapped in a card, listing composite components with
            their design-system status and any external dependency used.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table data-testid="composite-data-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Dependency</TableHead>
                  <TableHead className="w-40">Status</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.map((item, index) => {
                  const meta = STATUS_META[item.status];
                  return (
                    <TableRow
                      key={item.name}
                      data-testid={`composite-row-${index + 1}`}
                    >
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.dep === "—" ? (
                          <span className="text-xs">—</span>
                        ) : (
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {item.dep}
                          </code>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={meta.variant}
                          data-testid={`composite-status-${index + 1}`}
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
                          data-testid={`composite-preview-button-${index + 1}`}
                          onClick={() => setPreview(item)}
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent data-testid="composite-preview-dialog">
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
              Live preview of the composite component as used in this design
              system.
            </DialogDescription>
          </DialogHeader>

          <div
            className="flex min-h-[160px] items-center justify-center overflow-auto rounded-md border bg-background p-6"
            data-testid="composite-preview-body"
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
