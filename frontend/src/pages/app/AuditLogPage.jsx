import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FilterX,
  RefreshCw,
  Search,
} from "lucide-react";

import API from "@/lib/api";
import { EmptyState } from "@/components/composite/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const humanize = (s) =>
  (s || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const actionVariant = (action) => {
  if (action === "delete" || action === "bulk_delete") return "destructive";
  if (action === "create") return "secondary";
  return "outline";
};

const formatTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

const JsonBlock = ({ value, testid }) => (
  <pre
    className="max-h-56 overflow-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed"
    data-testid={testid}
  >
    {value ? JSON.stringify(value, null, 2) : "—"}
  </pre>
);

export default function AuditLogPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("loading");
  const [detail, setDetail] = useState(null);

  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = q.trim() || dateFrom || dateTo;

  const fetchLogs = useCallback(async () => {
    setStatus("loading");
    try {
      const params = { skip: page * pageSize, limit: pageSize };
      if (q.trim()) params.q = q.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await API.get("/audit-logs", { params });
      setRows(res.data);
      setTotal(Number(res.headers["x-total-count"] || res.data.length));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [page, pageSize, q, dateFrom, dateTo]);

  // Debounced fetch (covers the search box); resets to page 0 on filter change.
  useEffect(() => {
    const t = setTimeout(fetchLogs, 250);
    return () => clearTimeout(t);
  }, [fetchLogs]);

  const resetFilters = () => {
    setQ("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

  return (
    <div className="space-y-6" data-testid="audit-log-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Activity List</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchLogs} data-testid="audit-refresh">
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={q}
                onChange={(e) => {
                  setPage(0);
                  setQ(e.target.value);
                }}
                placeholder="Search summary, entity, actor..."
                className="pl-8"
                data-testid="audit-search"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setPage(0);
                  setDateFrom(e.target.value);
                }}
                className="h-9 w-[150px]"
                data-testid="audit-date-from"
                aria-label="From date"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setPage(0);
                  setDateTo(e.target.value);
                }}
                className="h-9 w-[150px]"
                data-testid="audit-date-to"
                aria-label="To date"
              />
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters} data-testid="audit-reset">
                  <FilterX className="size-4" /> Reset
                </Button>
              )}
            </div>
          </div>

          {/* Table / states */}
          <div className="rounded-md border">
            {status === "error" ? (
              <EmptyState
                variant="error"
                action={
                  <Button variant="outline" size="sm" onClick={fetchLogs} data-testid="audit-retry">
                    <RefreshCw className="size-4" /> Try again
                  </Button>
                }
              />
            ) : status === "loading" ? (
              <div className="space-y-2 p-4" data-testid="audit-loading">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                variant={hasFilters ? "no-results" : "first-time"}
                title={hasFilters ? "No matching activity" : "No activity yet"}
                description={
                  hasFilters
                    ? "Try adjusting the filters."
                    : "Changes to users, roles, offices and levels will appear here."
                }
                action={
                  hasFilters ? (
                    <Button variant="outline" size="sm" onClick={resetFilters} data-testid="audit-empty-reset">
                      <FilterX className="size-4" /> Reset filters
                    </Button>
                  ) : null
                }
              />
            ) : (
              <Table data-testid="audit-table" className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead className="whitespace-normal">Summary</TableHead>
                    <TableHead className="text-right">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} data-testid={`audit-row-${r.id}`}>
                      <TableCell className="text-muted-foreground">{formatTime(r.created_at)}</TableCell>
                      <TableCell>{r.actor}</TableCell>
                      <TableCell>
                        <Badge variant={actionVariant(r.action)} className="font-normal">
                          {humanize(r.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{r.entity_type}</TableCell>
                      <TableCell className="max-w-md truncate whitespace-normal text-muted-foreground">
                        {r.summary}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDetail(r)}
                          data-testid={`audit-view-${r.id}`}
                          aria-label="View details"
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Footer pagination */}
          {status === "ready" && total > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPage(0);
                    setPageSize(Number(v));
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]" data-testid="audit-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>of {total} entries</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground" data-testid="audit-page-indicator">
                  Page {page + 1} of {pageCount}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    data-testid="audit-prev"
                  >
                    <ChevronLeft className="size-4" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={page >= pageCount - 1}
                    data-testid="audit-next"
                  >
                    Next <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-2xl" data-testid="audit-detail-dialog">
          <DialogHeader>
            <DialogTitle>Audit entry</DialogTitle>
            <DialogDescription>{detail?.summary}</DialogDescription>
          </DialogHeader>
          {detail && (
            <DialogBody className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Time</dt>
                  <dd>{formatTime(detail.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Actor</dt>
                  <dd>{detail.actor}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Action</dt>
                  <dd>
                    <Badge variant={actionVariant(detail.action)} className="font-normal">
                      {humanize(detail.action)}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Entity</dt>
                  <dd className="capitalize">
                    {detail.entity_type}
                    {detail.entity_label ? ` — ${detail.entity_label}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Method &amp; Path</dt>
                  <dd className="font-mono text-xs">
                    {detail.method} {detail.path}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd>{detail.status_code ?? "—"}</dd>
                </div>
              </dl>

              {detail.changes?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Changed fields</p>
                  <div className="overflow-hidden rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead>Field</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.changes.map((c, i) => (
                          <TableRow key={`${c.field}-${i}`}>
                            <TableCell className="font-medium">{c.field}</TableCell>
                            <TableCell className="text-muted-foreground">{String(c.from ?? "—")}</TableCell>
                            <TableCell>{String(c.to ?? "—")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Request</p>
                  <JsonBlock value={detail.request} testid="audit-detail-request" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Response</p>
                  <JsonBlock value={detail.response} testid="audit-detail-response" />
                </div>
              </div>
            </DialogBody>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
