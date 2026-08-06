import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FilterX,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import API from "@/lib/api";
import { SortHead } from "@/components/composite/sortable-table";
import { EmptyState } from "@/components/composite/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const toggleSort = (key) =>
    setSort((p) => (p.key === key ? { key, dir: p.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const [selected, setSelected] = useState({}); // id -> true
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeFrom, setPurgeFrom] = useState("");
  const [purgeTo, setPurgeTo] = useState("");
  const [purging, setPurging] = useState(false);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = q.trim() || dateFrom || dateTo;

  const filterParams = useCallback(() => {
    const params = {};
    if (q.trim()) params.q = q.trim();
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [q, dateFrom, dateTo]);

  const fetchLogs = useCallback(async () => {
    setStatus("loading");
    try {
      const params = { skip: page * pageSize, limit: pageSize };
      if (q.trim()) params.q = q.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      params.sort_by = sort.key;
      params.sort_dir = sort.dir;
      const res = await API.get("/audit-logs", { params });
      setRows(res.data);
      setTotal(Number(res.headers["x-total-count"] || res.data.length));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [page, pageSize, q, dateFrom, dateTo, sort]);

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

  const exportLogs = async (format) => {
    setExporting(true);
    try {
      const params = { ...filterParams(), format };
      const res = await API.get("/audit-logs/export", { params, responseType: "blob" });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "");
      downloadBlob(res.data, `audit_log_${stamp}.${format === "xlsx" ? "xlsx" : "csv"}`);
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const openPurge = () => {
    setPurgeFrom(dateFrom || "");
    setPurgeTo(dateTo || "");
    setPurgeOpen(true);
  };

  const runPurge = async () => {
    if (!purgeFrom && !purgeTo) {
      toast.error("Choose a from and/or to date to purge.");
      return;
    }
    setPurging(true);
    try {
      const { data } = await API.post("/audit-logs/purge", {
        date_from: purgeFrom || undefined,
        date_to: purgeTo || undefined,
      });
      toast.success(`Purged ${data.deleted} audit entr${data.deleted === 1 ? "y" : "ies"}`);
      setPurgeOpen(false);
      setPage(0);
      fetchLogs();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Purge failed. Please try again.");
    } finally {
      setPurging(false);
    }
  };

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const selectedCount = selectedIds.length;
  const pageIds = rows.map((r) => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected[id]);
  const somePageSelected = pageIds.some((id) => selected[id]);

  const toggleRow = (id, value) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (value) next[id] = true;
      else delete next[id];
      return next;
    });

  const togglePage = (value) =>
    setSelected((prev) => {
      const next = { ...prev };
      pageIds.forEach((id) => {
        if (value) next[id] = true;
        else delete next[id];
      });
      return next;
    });

  const runBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const { data } = await API.post("/audit-logs/bulk-delete", { ids: selectedIds });
      toast.success(`Deleted ${data.deleted} audit entr${data.deleted === 1 ? "y" : "ies"}`);
      setBulkOpen(false);
      setSelected({});
      if (page > 0 && rows.length === selectedCount) setPage((p) => Math.max(0, p - 1));
      else fetchLogs();
    } catch (err) {
      const d = err?.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Delete failed. Please try again.");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="audit-log-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Activity List</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {selectedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setBulkOpen(true)}
                data-testid="audit-bulk-delete"
              >
                <Trash2 className="size-4" /> Delete ({selectedCount})
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={exporting} data-testid="audit-export">
                  {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportLogs("csv")} data-testid="audit-export-csv">
                  <FileText className="size-4" /> Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportLogs("xlsx")} data-testid="audit-export-xlsx">
                  <FileSpreadsheet className="size-4" /> Export Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={openPurge}
              data-testid="audit-purge-open"
            >
              <Trash2 className="size-4" /> Purge
            </Button>
            <Button variant="outline" size="sm" onClick={fetchLogs} data-testid="audit-refresh">
              <RefreshCw className="size-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-[15rem]">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={q}
                onChange={(e) => {
                  setPage(0);
                  setQ(e.target.value);
                }}
                placeholder="Search..."
                className="h-[var(--ctl-h-sm)] pl-8 text-xs"
                data-testid="audit-search"
              />
            </div>
            <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setPage(0);
                  setDateFrom(e.target.value);
                }}
                className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-[150px]"
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
                className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-[150px]"
                data-testid="audit-date-to"
                aria-label="To date"
              />
              {hasFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="col-span-2 sm:col-auto"
                  data-testid="audit-reset"
                >
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
              <Table data-testid="audit-table" className="tbl-density [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                        onCheckedChange={(v) => togglePage(!!v)}
                        aria-label="Select all on this page"
                        data-testid="audit-select-all"
                      />
                    </TableHead>
                    <TableHead>
                      <SortHead label="Time" sortKey="created_at" sort={sort} onToggle={toggleSort} />
                    </TableHead>
                    <TableHead>
                      <SortHead label="Actor" sortKey="actor" sort={sort} onToggle={toggleSort} />
                    </TableHead>
                    <TableHead>
                      <SortHead label="Action" sortKey="action" sort={sort} onToggle={toggleSort} />
                    </TableHead>
                    <TableHead>
                      <SortHead label="Entity" sortKey="entity_type" sort={sort} onToggle={toggleSort} />
                    </TableHead>
                    <TableHead className="whitespace-normal">
                      <SortHead label="Summary" sortKey="summary" sort={sort} onToggle={toggleSort} />
                    </TableHead>
                    <TableHead className="text-right">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} data-state={selected[r.id] ? "selected" : undefined} data-testid={`audit-row-${r.id}`}>
                      <TableCell className="w-10">
                        <Checkbox
                          checked={!!selected[r.id]}
                          onCheckedChange={(v) => toggleRow(r.id, !!v)}
                          aria-label="Select row"
                          data-testid={`audit-select-${r.id}`}
                        />
                      </TableCell>
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
                          className="size-7"
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
                  <SelectTrigger className="h-[var(--ctl-h-sm)] w-[70px]" data-testid="audit-page-size">
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
                <span>of {total.toLocaleString()} rows</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-xs text-muted-foreground" data-testid="audit-page-indicator">
                  Page {page + 1} of {pageCount}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-[var(--ctl-h-sm)]"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    aria-label="Previous page"
                    data-testid="audit-prev"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-[var(--ctl-h-sm)]"
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={page >= pageCount - 1}
                    aria-label="Next page"
                    data-testid="audit-next"
                  >
                    <ChevronRight className="size-4" />
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
                <div className="col-span-2 sm:col-auto">
                  <dt className="text-xs text-muted-foreground">Method &amp; Path</dt>
                  <dd className="break-all font-mono text-xs">
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
      {/* Purge (retention) dialog */}
      <Dialog open={purgeOpen} onOpenChange={(v) => !purging && setPurgeOpen(v)}>
        <DialogContent className="sm:max-w-md" data-testid="audit-purge-dialog">
          <DialogHeader>
            <DialogTitle>Purge audit logs</DialogTitle>
            <DialogDescription>
              Permanently delete audit entries within a date range. At least one bound is required.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="purge-from">From date</Label>
                <Input
                  id="purge-from"
                  type="date"
                  value={purgeFrom}
                  onChange={(e) => setPurgeFrom(e.target.value)}
                  data-testid="audit-purge-from"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="purge-to">To date</Label>
                <Input
                  id="purge-to"
                  type="date"
                  value={purgeTo}
                  onChange={(e) => setPurgeTo(e.target.value)}
                  data-testid="audit-purge-to"
                />
              </div>
            </div>
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Destructive action</AlertTitle>
              <AlertDescription>
                Deleted audit entries cannot be recovered. Export first if you need a copy.
              </AlertDescription>
            </Alert>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={purging} data-testid="audit-purge-cancel">
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={runPurge}
              disabled={purging}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="audit-purge-confirm"
            >
              {purging ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Purge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Bulk delete confirm */}
      <AlertDialog open={bulkOpen} onOpenChange={(v) => !bulkDeleting && setBulkOpen(v)}>
        <AlertDialogContent data-testid="audit-bulk-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} audit entry(ies)?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4 text-sm text-muted-foreground">
            This permanently removes the selected audit log entries. This cannot be undone.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="audit-bulk-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                runBulkDelete();
              }}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="audit-bulk-delete-confirm"
            >
              {bulkDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
