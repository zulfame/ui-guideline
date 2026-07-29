import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
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
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatRelative,
  statusBadgeVariant,
} from "@/lib/format";

const ROWS = [
  {
    id: 1,
    name: "Item 1",
    amount: 1250.5,
    growth: 0.128,
    units: 3420,
    created: "2026-01-14",
    active: "2026-06-02T09:24:00",
    status: "Active",
  },
  {
    id: 2,
    name: "Item 2",
    amount: -320,
    growth: -0.045,
    units: 0,
    created: "2025-11-30",
    active: "2026-05-28T17:03:00",
    status: "Inactive",
  },
  {
    id: 3,
    name: "Item 3",
    amount: null,
    growth: null,
    units: null,
    created: null,
    active: null,
    status: "Pending",
  },
];

export default function DataDisplayBlockPage() {
  return (
    <div className="space-y-6" data-testid="data-display-block-page">
      <PageHeader
        title="Data Display"
        description="Formatting conventions — numbers, currency, percentage, date, relative time and status."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formatted values</CardTitle>
          <CardDescription>
            Numbers align right with tabular figures; nil values render as an em
            dash; status uses fixed Badge variants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table data-testid="dd-table">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Growth</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROWS.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={cn(
                          r.amount != null && r.amount < 0 && "text-destructive",
                        )}
                      >
                        {formatCurrency(r.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span
                        className={cn(
                          r.growth != null && r.growth < 0 && "text-destructive",
                        )}
                      >
                        {formatPercent(r.growth)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(r.units)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(r.created)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelative(r.active)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(r.status)}>
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
