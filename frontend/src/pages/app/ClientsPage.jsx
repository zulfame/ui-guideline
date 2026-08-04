import { useCallback, useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Ban,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FilterX,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
  Trash2,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { useNavigate } from "react-router-dom";

import API from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/composite/EmptyState";
import { DensityToggle } from "@/components/density-toggle";
import { toast } from "@/components/ui/sonner";

const usageChartConfig = { count: { label: "Requests", color: "hsl(var(--chart-1))" } };

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

function SortableHeader({ column, children, align = "left" }) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className={`flex h-full w-full items-center gap-1 font-medium ${align === "right" ? "justify-end text-right" : "text-left"}`}
      data-testid={`sort-${column.id}`}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUp className="size-3.5" aria-hidden="true" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3.5" aria-hidden="true" />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-50" aria-hidden="true" />
      )}
    </button>
  );
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);

  // Create / edit form
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [limitInput, setLimitInput] = useState("");
  const [windowInput, setWindowInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Reveal key (once)
  const [revealKey, setRevealKey] = useState(null);
  const [copied, setCopied] = useState(false);

  // Confirms
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [regenTarget, setRegenTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [acting, setActing] = useState(false);

  // Usage
  const [usageTarget, setUsageTarget] = useState(null);
  const [usage, setUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const fetchClients = useCallback(async () => {
    setStatus("loading");
    try {
      const { data } = await API.get("/clients");
      setClients(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const openCreate = () => {
    setFormMode("create");
    setEditingId(null);
    setName("");
    setLimitInput("");
    setWindowInput("");
    setFormOpen(true);
  };

  const openEdit = (c) => {
    setFormMode("edit");
    setEditingId(c.id);
    setName(c.name);
    setLimitInput(c.rate_limit != null ? String(c.rate_limit) : "");
    setWindowInput(c.rate_window_seconds != null ? String(c.rate_window_seconds) : "");
    setFormOpen(true);
  };

  const submitForm = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const rate_limit = limitInput.trim() === "" ? null : parseInt(limitInput, 10);
    const rate_window_seconds = windowInput.trim() === "" ? null : parseInt(windowInput, 10);
    if (rate_limit != null && (Number.isNaN(rate_limit) || rate_limit < 1)) {
      toast.error("Rate limit must be a positive number");
      return;
    }
    if (rate_window_seconds != null && (Number.isNaN(rate_window_seconds) || rate_window_seconds < 1)) {
      toast.error("Window must be a positive number of seconds");
      return;
    }
    setSaving(true);
    try {
      const body = { name: name.trim(), rate_limit, rate_window_seconds };
      if (formMode === "create") {
        const { data } = await API.post("/clients", body);
        setFormOpen(false);
        setRevealKey({ key: data.api_key, name: data.name });
        toast.success("API client created");
      } else {
        await API.put(`/clients/${editingId}`, body);
        setFormOpen(false);
        toast.success("Client updated");
      }
      await fetchClients();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save client");
    } finally {
      setSaving(false);
    }
  };

  const doRegenerate = async () => {
    setActing(true);
    try {
      const { data } = await API.post(`/clients/${regenTarget.id}/regenerate`);
      setRegenTarget(null);
      setRevealKey({ key: data.api_key, name: data.name });
      await fetchClients();
      toast.success("Key regenerated");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to regenerate key");
    } finally {
      setActing(false);
    }
  };

  const doRevoke = async () => {
    setActing(true);
    try {
      await API.post(`/clients/${revokeTarget.id}/revoke`);
      setRevokeTarget(null);
      await fetchClients();
      toast.success("Client revoked");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to revoke client");
    } finally {
      setActing(false);
    }
  };

  const doDelete = async () => {
    setActing(true);
    try {
      await API.delete(`/clients/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchClients();
      toast.success("Client deleted");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to delete client");
    } finally {
      setActing(false);
    }
  };

  const openUsage = async (c) => {
    setUsageTarget(c);
    setUsage(null);
    setUsageLoading(true);
    try {
      const { data } = await API.get(`/clients/${c.id}/usage?days=14`);
      setUsage(data);
    } catch {
      toast.error("Failed to load usage");
    } finally {
      setUsageLoading(false);
    }
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(revealKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy — please copy manually");
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "key_masked",
        header: ({ column }) => <SortableHeader column={column}>Key</SortableHeader>,
        cell: ({ row }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.original.key_masked}</code>
        ),
      },
      {
        id: "rate_limit",
        accessorFn: (r) => r.rate_limit ?? 0,
        header: ({ column }) => <SortableHeader column={column}>Rate limit</SortableHeader>,
        cell: ({ row }) => (
          <span className="text-muted-foreground" data-testid={`client-rate-${row.original.id}`}>
            {row.original.rate_limit != null
              ? `${row.original.rate_limit}/${row.original.rate_window_seconds ?? 60}s`
              : "Default"}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (r) => (r.active ? "Active" : "Revoked"),
        header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
        cell: ({ row }) => (
          <Badge
            variant={row.original.active ? "secondary" : "destructive"}
            className="font-normal"
            data-testid={`client-status-${row.original.id}`}
          >
            {row.original.active ? "Active" : "Revoked"}
          </Badge>
        ),
      },
      {
        id: "requests",
        accessorFn: (r) => r.request_count ?? 0,
        header: ({ column }) => <SortableHeader column={column} align="right">Requests</SortableHeader>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums" data-testid={`client-requests-${row.original.id}`}>
            {(row.original.request_count ?? 0).toLocaleString()}
          </div>
        ),
      },
      {
        accessorKey: "last_used_at",
        header: ({ column }) => <SortableHeader column={column}>Last used</SortableHeader>,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{fmtDate(row.original.last_used_at)}</span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Row actions"
                    data-testid={`client-row-actions-${c.id}`}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openUsage(c)} data-testid={`client-usage-${c.id}`}>
                    <BarChart3 className="size-4" /> View usage
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(c)} data-testid={`client-edit-${c.id}`}>
                    <Pencil className="size-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRegenTarget(c)} data-testid={`client-regenerate-${c.id}`}>
                    <RefreshCw className="size-4" /> Regenerate key
                  </DropdownMenuItem>
                  {c.active && (
                    <DropdownMenuItem onClick={() => setRevokeTarget(c)} data-testid={`client-revoke-${c.id}`}>
                      <Ban className="size-4" /> Revoke
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget(c)}
                    data-testid={`client-delete-${c.id}`}
                  >
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: clients,
    columns,
    state: { sorting, globalFilter },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const hasSearch = globalFilter.trim().length > 0;

  return (
    <div className="space-y-6" data-testid="clients-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">API Clients</CardTitle>
          <Button size="sm" onClick={openCreate} data-testid="clients-add">
            <Plus className="size-4" /> New Client
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search clients..."
                className="pl-8"
                data-testid="clients-search"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasSearch && (
                <Button variant="outline" size="sm" onClick={() => setGlobalFilter("")} data-testid="clients-reset">
                  <FilterX className="size-4" /> Reset
                </Button>
              )}
              <DensityToggle />
            </div>
          </div>

          {/* Table / states */}
          <div className="rounded-md border">
            {status === "error" ? (
              <EmptyState
                variant="error"
                action={
                  <Button variant="outline" size="sm" onClick={fetchClients} data-testid="clients-retry">
                    <RefreshCw className="size-4" /> Try again
                  </Button>
                }
              />
            ) : status === "loading" ? (
              <div className="space-y-2 p-4" data-testid="clients-loading">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : clients.length === 0 ? (
              <EmptyState
                variant="first-time"
                title="No API clients yet"
                description="Create your first API client to issue a key."
                action={
                  <Button size="sm" onClick={openCreate} data-testid="clients-empty-add">
                    <Plus className="size-4" /> New Client
                  </Button>
                }
              />
            ) : (
              <Table data-testid="clients-table" className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                      {hg.headers.map((h) => (
                        <TableHead key={h.id}>
                          {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} data-testid={`client-row-${row.original.id}`}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2" data-testid="clients-empty-filtered">
                          <span>No clients match your search.</span>
                          <Button variant="outline" size="sm" onClick={() => setGlobalFilter("")} data-testid="clients-clear-search">
                            <FilterX className="size-4" /> Reset
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Footer */}
          {status === "ready" && clients.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[70px]" data-testid="clients-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>of {totalRows.toLocaleString()} rows</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-xs text-muted-foreground">
                  Page {pageIndex + 1} of {Math.max(1, table.getPageCount())}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    aria-label="Next page"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API documentation — full reference lives on its own page */}
      <Card data-testid="api-docs-card">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Terminal className="size-5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold">API Documentation</h3>
              <p className="text-xs text-muted-foreground">
                Full request &amp; response examples for the mobile and API-key endpoints.
                Use a key created above as <code className="rounded bg-muted px-1 py-0.5">YOUR_API_KEY</code>.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/developers")}
            className="shrink-0"
            data-testid="open-api-docs-button"
          >
            View API Docs <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="clients-form-dialog">
          <DialogHeader>
            <DialogTitle>{formMode === "create" ? "Add API Client" : "Edit API Client"}</DialogTitle>
            <DialogDescription>
              {formMode === "create"
                ? "Create a new API client. Name is required; rate limits are optional."
                : "Update the client name and rate limits."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="client-name">Name</Label>
                <Input
                  id="client-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mobile App"
                  data-testid="client-name-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-limit">Rate limit (requests)</Label>
                <Input
                  id="client-limit"
                  type="number"
                  min="1"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  placeholder="Default (60)"
                  data-testid="client-limit-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-window">Window (seconds)</Label>
                <Input
                  id="client-window"
                  type="number"
                  min="1"
                  value={windowInput}
                  onChange={(e) => setWindowInput(e.target.value)}
                  placeholder="Default (60)"
                  data-testid="client-window-input"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Leave rate fields blank to use the server default.</p>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" data-testid="clients-form-cancel">Cancel</Button>
            </DialogClose>
            <Button onClick={submitForm} disabled={saving} data-testid="clients-form-submit">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              {formMode === "create" ? "Create client" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal key dialog (once) */}
      <Dialog open={!!revealKey} onOpenChange={(o) => !o && setRevealKey(null)}>
        <DialogContent data-testid="client-key-dialog">
          <DialogHeader>
            <DialogTitle>Copy your API key</DialogTitle>
            <DialogDescription>
              This is the only time the full key for <strong>{revealKey?.name}</strong> is shown. Store it securely.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
              <code className="flex-1 break-all text-xs" data-testid="client-key-value">{revealKey?.key}</code>
              <Button size="icon" variant="ghost" className="size-8" onClick={copyKey} data-testid="client-key-copy">
                {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setRevealKey(null)} data-testid="client-key-done">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage trend dialog */}
      <Dialog open={!!usageTarget} onOpenChange={(o) => !o && setUsageTarget(null)}>
        <DialogContent data-testid="client-usage-dialog">
          <DialogHeader>
            <DialogTitle>API usage — {usageTarget?.name}</DialogTitle>
            <DialogDescription>
              Requests per day (last 14 days){usage ? ` — ${usage.total.toLocaleString()} total` : ""}.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {usageLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : usage && usage.total > 0 ? (
              <ChartContainer config={usageChartConfig} className="h-56 w-full">
                <BarChart data={usage.series}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => v.slice(5)} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} isAnimationActive={false} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground" data-testid="client-usage-empty">
                No requests recorded yet for this key.
              </p>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Regenerate confirm */}
      <AlertDialog open={!!regenTarget} onOpenChange={(o) => !o && setRegenTarget(null)}>
        <AlertDialogContent data-testid="client-regenerate-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate key?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4 text-sm text-muted-foreground">
            The current key for <span className="font-medium text-foreground">{regenTarget?.name}</span> will stop
            working immediately and a new key will be issued.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="client-regenerate-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doRegenerate();
              }}
              disabled={acting}
              data-testid="client-regenerate-confirm"
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke confirm */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent data-testid="client-revoke-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke client?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{revokeTarget?.name}</span> will be disabled and its key
            will stop working.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="client-revoke-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doRevoke();
              }}
              disabled={acting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="client-revoke-confirm"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="client-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4 text-sm text-muted-foreground">
            This permanently removes <span className="font-medium text-foreground">{deleteTarget?.name}</span> and
            its key. This cannot be undone.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="client-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doDelete();
              }}
              disabled={acting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="client-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
