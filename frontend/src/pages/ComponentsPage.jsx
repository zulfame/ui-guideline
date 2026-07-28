import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Generic placeholder columns. Data intentionally empty → empty state (R26).
const columns = ["ID", "Name", "Status", "Date"];
const rows = [];

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
            A data table wrapped in a card. Shows the standard empty state when
            there is no data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table data-testid="data-table">
              <TableHeader>
                <TableRow>
                  {columns.map((col, index) => (
                    <TableHead
                      key={col}
                      className={index === columns.length - 1 ? "text-right" : undefined}
                    >
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-sm text-muted-foreground"
                      data-testid="table-empty-state"
                    >
                      No Data Available
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.id}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell className="text-right">{row.date}</TableCell>
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
