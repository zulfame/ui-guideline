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
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FilterX,
  KeyRound,
  Loader2,
  LockOpen,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import API from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { EmptyState } from "@/components/composite/EmptyState";
import { DensityToggle } from "@/components/density-toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";

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

function DataTableCard({
  title,
  description,
  onRefresh,
  refreshTestId,
  headerAction,
  columns,
  data,
  loading,
  searchPlaceholder,
  testid,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
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
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerAction}
          <Button variant="outline" size="sm" onClick={onRefresh} data-testid={refreshTestId}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8"
              data-testid={`${testid}-search`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasSearch && (
              <Button variant="outline" size="sm" onClick={() => setGlobalFilter("")} data-testid={`${testid}-reset`}>
                <FilterX className="size-4" /> Reset
              </Button>
            )}
            <DensityToggle />
          </div>
        </div>

        <div className="rounded-md border">
          {loading ? (
            <div className="space-y-2 p-4" data-testid={`${testid}-loading`}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <EmptyState variant="first-time" icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
          ) : (
            <Table data-testid={`${testid}-table`} className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
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
                    <TableRow key={row.id}>
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
                      <div className="flex flex-col items-center gap-2" data-testid={`${testid}-empty-filtered`}>
                        <span>No rows match your search.</span>
                        <Button variant="outline" size="sm" onClick={() => setGlobalFilter("")}>
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

        {!loading && data.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-[70px]" data-testid={`${testid}-page-size`}>
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
  );
}

export default function LoginSecurityPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(null);
  const [resets, setResets] = useState([]);
  const [resetsLoading, setResetsLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [deleteAttempt, setDeleteAttempt] = useState(null);
  const [clearAttemptsOpen, setClearAttemptsOpen] = useState(false);
  const [deleteReset, setDeleteReset] = useState(null);
  const [clearResetsOpen, setClearResetsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/login-attempts");
      setRows(data);
    } catch {
      toast.error("Failed to load login attempts");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadResets = useCallback(async () => {
    setResetsLoading(true);
    try {
      const { data } = await API.get("/password-resets", { params: { limit: 50 } });
      setResets(data);
    } catch {
      toast.error("Failed to load password reset history");
    } finally {
      setResetsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadResets();
  }, [load, loadResets]);

  const unlock = useCallback(
    async (row) => {
      setUnlocking(row.key);
      try {
        await API.post("/login-attempts/unlock", { key: row.key });
        toast.success(`Unlocked ${row.identifier}`);
        await load();
      } catch (e) {
        toast.error(e?.response?.data?.detail || "Failed to unlock");
      } finally {
        setUnlocking(null);
      }
    },
    [load],
  );

  const doDeleteAttempt = async () => {
    setActing(true);
    try {
      await API.delete(`/login-attempts/${encodeURIComponent(deleteAttempt.key)}`);
      toast.success(`Deleted record for ${deleteAttempt.identifier}`);
      setDeleteAttempt(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to delete record");
    } finally {
      setActing(false);
    }
  };

  const doClearAttempts = async () => {
    setActing(true);
    try {
      const { data } = await API.post("/login-attempts/clear");
      toast.success(`Cleared ${data.deleted} record(s)`);
      setClearAttemptsOpen(false);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to clear records");
    } finally {
      setActing(false);
    }
  };

  const doDeleteReset = async () => {
    setActing(true);
    try {
      await API.delete(`/password-resets/${encodeURIComponent(deleteReset.id)}`);
      toast.success("Reset request deleted");
      setDeleteReset(null);
      await loadResets();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to delete request");
    } finally {
      setActing(false);
    }
  };

  const doClearResets = async () => {
    setActing(true);
    try {
      const { data } = await API.post("/password-resets/clear");
      toast.success(`Cleared ${data.deleted} request(s)`);
      setClearResetsOpen(false);
      await loadResets();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to clear requests");
    } finally {
      setActing(false);
    }
  };

  const loginColumns = useMemo(
    () => [
      {
        accessorKey: "identifier",
        header: ({ column }) => <SortableHeader column={column}>Identifier</SortableHeader>,
        cell: ({ row }) => <span className="font-medium">{row.original.identifier}</span>,
      },
      {
        accessorKey: "ip",
        header: ({ column }) => <SortableHeader column={column}>IP address</SortableHeader>,
        cell: ({ row }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.original.ip || "—"}</code>
        ),
      },
      {
        accessorKey: "fails",
        header: ({ column }) => <SortableHeader column={column} align="right">Failed attempts</SortableHeader>,
        cell: ({ row }) => <div className="text-right tabular-nums">{row.original.fails}</div>,
      },
      {
        accessorKey: "last_fail_at",
        header: ({ column }) => <SortableHeader column={column}>Last attempt</SortableHeader>,
        cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.last_fail_at)}</span>,
      },
      {
        id: "status",
        accessorFn: (r) => (r.is_locked ? "Locked" : "Not locked"),
        header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
        cell: ({ row }) =>
          row.original.is_locked ? (
            <Badge variant="destructive" className="font-normal" data-testid={`login-attempt-status-${row.original.key}`}>
              Locked until {fmtDate(row.original.locked_until)}
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-normal" data-testid={`login-attempt-status-${row.original.key}`}>
              Not locked
            </Badge>
          ),
      },
      {
        id: "action",
        enableSorting: false,
        header: () => <span className="sr-only">Action</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => unlock(row.original)}
              disabled={unlocking === row.original.key || !row.original.is_locked}
              data-testid={`login-attempt-unlock-${row.original.key}`}
            >
              {unlocking === row.original.key ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LockOpen className="size-4" />
              )}
              Unlock
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteAttempt(row.original)}
              aria-label="Delete record"
              data-testid={`login-attempt-delete-${row.original.key}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [unlock, unlocking],
  );

  const resetColumns = useMemo(
    () => [
      {
        accessorKey: "email",
        header: ({ column }) => <SortableHeader column={column}>Email</SortableHeader>,
        cell: ({ row }) => <span className="font-medium">{row.original.email || "—"}</span>,
      },
      {
        accessorKey: "requested_at",
        header: ({ column }) => <SortableHeader column={column}>Requested</SortableHeader>,
        cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.requested_at)}</span>,
      },
      {
        id: "email_sent",
        accessorFn: (r) => (r.account_found === false ? "No account" : r.email_sent ? "Sent" : "Not sent"),
        header: ({ column }) => <SortableHeader column={column}>Email sent</SortableHeader>,
        cell: ({ row }) => {
          const r = row.original;
          if (r.account_found === false)
            return <Badge variant="outline" className="font-normal text-muted-foreground">No account</Badge>;
          return r.email_sent ? (
            <Badge variant="secondary" className="font-normal">Sent</Badge>
          ) : (
            <Badge variant="destructive" className="font-normal">Not sent</Badge>
          );
        },
      },
      {
        id: "status",
        accessorFn: (r) => (r.completed ? "Completed" : r.account_found === false ? "Ignored" : "Pending"),
        header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
        cell: ({ row }) => {
          const r = row.original;
          if (r.completed) return <Badge className="font-normal">Completed</Badge>;
          if (r.account_found === false)
            return <Badge variant="outline" className="font-normal text-muted-foreground">Ignored</Badge>;
          return <Badge variant="secondary" className="font-normal">Pending</Badge>;
        },
      },
      {
        id: "action",
        enableSorting: false,
        header: () => <span className="sr-only">Action</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteReset(row.original)}
              disabled={!row.original.id}
              aria-label="Delete request"
              data-testid={`password-reset-delete-${row.original.id}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6" data-testid="login-security-page">
      <DataTableCard
        title="Login Security"
        description="Recent failed-login activity and temporary lockouts (per IP + identifier)."
        onRefresh={load}
        refreshTestId="login-security-refresh"
        headerAction={
          rows.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setClearAttemptsOpen(true)}
              data-testid="login-security-clear"
            >
              <Trash2 className="size-4" /> Clear all
            </Button>
          ) : null
        }
        columns={loginColumns}
        data={rows}
        loading={loading}
        searchPlaceholder="Search identifier or IP..."
        testid="login-security"
        emptyIcon={ShieldAlert}
        emptyTitle="No suspicious activity"
        emptyDescription="There are no recorded failed-login attempts right now."
      />

      <DataTableCard
        title="Password Reset Requests"
        description="Recent self-service reset requests, whether the email was sent, and if the reset was completed."
        onRefresh={loadResets}
        refreshTestId="password-resets-refresh"
        headerAction={
          resets.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setClearResetsOpen(true)}
              data-testid="password-resets-clear"
            >
              <Trash2 className="size-4" /> Clear all
            </Button>
          ) : null
        }
        columns={resetColumns}
        data={resets}
        loading={resetsLoading}
        searchPlaceholder="Search email..."
        testid="password-resets"
        emptyIcon={KeyRound}
        emptyTitle="No reset requests"
        emptyDescription="No password reset has been requested recently."
      />

      {/* Delete single login record */}
      <AlertDialog open={!!deleteAttempt} onOpenChange={(v) => !acting && !v && setDeleteAttempt(null)}>
        <AlertDialogContent data-testid="login-attempt-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4 text-sm text-muted-foreground">
            Removes the login-throttle record for <span className="font-medium text-foreground">{deleteAttempt?.identifier}</span>.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="login-attempt-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doDeleteAttempt(); }}
              disabled={acting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="login-attempt-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all login records */}
      <AlertDialog open={clearAttemptsOpen} onOpenChange={(v) => !acting && setClearAttemptsOpen(v)}>
        <AlertDialogContent data-testid="login-security-clear-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all login records?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4 text-sm text-muted-foreground">
            This removes every login-throttle record, including any active lockouts. This cannot be undone.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="login-security-clear-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doClearAttempts(); }}
              disabled={acting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="login-security-clear-confirm"
            >
              Clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete single reset request */}
      <AlertDialog open={!!deleteReset} onOpenChange={(v) => !acting && !v && setDeleteReset(null)}>
        <AlertDialogContent data-testid="password-reset-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this request?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4 text-sm text-muted-foreground">
            Removes the password reset request for <span className="font-medium text-foreground">{deleteReset?.email}</span>.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="password-reset-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doDeleteReset(); }}
              disabled={acting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="password-reset-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all reset requests */}
      <AlertDialog open={clearResetsOpen} onOpenChange={(v) => !acting && setClearResetsOpen(v)}>
        <AlertDialogContent data-testid="password-resets-clear-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all reset requests?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4 text-sm text-muted-foreground">
            This removes all recorded password reset requests. This cannot be undone.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="password-resets-clear-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doClearResets(); }}
              disabled={acting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="password-resets-clear-confirm"
            >
              Clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
