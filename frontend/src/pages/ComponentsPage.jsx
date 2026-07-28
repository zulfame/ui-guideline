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
import { toast } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// shadcn/ui "All Components" list (source: https://ui.shadcn.com/docs/components).
const components = [
  "Accordion",
  "Alert",
  "Alert Dialog",
  "Aspect Ratio",
  "Attachment",
  "Avatar",
  "Badge",
  "Breadcrumb",
  "Bubble",
  "Button",
  "Button Group",
  "Calendar",
  "Card",
  "Carousel",
  "Chart",
  "Checkbox",
  "Collapsible",
  "Combobox",
  "Command",
  "Context Menu",
  "Data Table",
  "Date Picker",
  "Dialog",
  "Direction",
  "Drawer",
  "Dropdown Menu",
  "Empty",
  "Field",
  "Hover Card",
  "Input",
  "Input Group",
  "Input OTP",
  "Item",
  "Kbd",
  "Label",
  "Marker",
  "Menubar",
  "Message",
  "Message Scroller",
  "Native Select",
  "Navigation Menu",
  "Pagination",
  "Popover",
  "Progress",
  "Radio Group",
  "Resizable",
  "Scroll Area",
  "Select",
  "Separator",
  "Sheet",
  "Sidebar",
  "Skeleton",
  "Slider",
  "Spinner",
  "Switch",
  "Table",
  "Tabs",
  "Textarea",
  "Toast",
  "Toggle",
  "Toggle Group",
  "Tooltip",
  "Typography",
];

export default function ComponentsPage() {
  return (
    <div className="space-y-6" data-testid="components-page">
      <PageHeader
        title="Components"
        description="Showcase of standard shadcn/ui primitives used across the design system."
      />

      <Card data-testid="table-card">
        <CardHeader>
          <CardTitle className="text-base">Table</CardTitle>
          <CardDescription>
            A data table wrapped in a card, listing all shadcn/ui components.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table data-testid="data-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-sm text-muted-foreground"
                      data-testid="table-empty-state"
                    >
                      No Data Available
                    </TableCell>
                  </TableRow>
                ) : (
                  components.map((name, index) => (
                    <TableRow key={name} data-testid={`table-row-${index + 1}`}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label={`Preview ${name}`}
                          data-testid={`preview-button-${index + 1}`}
                          onClick={() =>
                            toast("Preview", {
                              description: `Placeholder preview for "${name}".`,
                            })
                          }
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
