import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
  Copy,
  Download,
  FilterX,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import API, { fetchAll } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialogDescription,
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EmptyState } from "@/components/composite/EmptyState";
import { ImportDialog } from "@/components/composite/ImportDialog";
import { DensityToggle } from "@/components/density-toggle";
import { useAuth } from "@/context/AuthContext";

const emptyToUndef = (v) => (v === "" || v === null ? undefined : v);

const officeSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  telephone: z.string().optional(),
  latitude: z.preprocess(
    emptyToUndef,
    z.coerce.number().min(-90, "Min -90").max(90, "Max 90").optional(),
  ),
  longitude: z.preprocess(
    emptyToUndef,
    z.coerce.number().min(-180, "Min -180").max(180, "Max 180").optional(),
  ),
  radius: z.preprocess(
    emptyToUndef,
    z.coerce.number().min(0, "Must be ≥ 0").optional(),
  ),
  note: z.string().optional(),
});

const emptyValues = {
  code: "",
  name: "",
  address: "",
  telephone: "",
  latitude: "",
  longitude: "",
  radius: "",
  note: "",
};

function toFormValues(office) {
  if (!office) return emptyValues;
  return {
    code: office.code ?? "",
    name: office.name ?? "",
    address: office.address ?? "",
    telephone: office.telephone ?? "",
    latitude: office.latitude ?? "",
    longitude: office.longitude ?? "",
    radius: office.radius ?? "",
    note: office.note ?? "",
  };
}

function buildPayload(data, isEdit) {
  const payload = { code: data.code.trim(), name: data.name.trim() };
  // Optional strings: send value when present; on edit, send null to CLEAR.
  ["address", "telephone", "note"].forEach((k) => {
    const v = data[k] ? data[k].trim() : "";
    if (v) payload[k] = v;
    else if (isEdit) payload[k] = null;
  });
  // Optional coordinates: same rule (null clears on edit).
  ["latitude", "longitude"].forEach((k) => {
    const raw = data[k];
    if (raw !== undefined && raw !== "" && !Number.isNaN(Number(raw))) {
      payload[k] = Number(raw);
    } else if (isEdit) {
      payload[k] = null;
    }
  });
  // Radius has a default (100): send when provided; on edit, reset to 100 when cleared.
  if (data.radius !== undefined && data.radius !== "" && !Number.isNaN(Number(data.radius))) {
    payload.radius = Number(data.radius);
  } else if (isEdit) {
    payload.radius = 100;
  }
  return payload;
}

function OfficeFormDialog({ open, onOpenChange, mode, initialValues, onSaved }) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm({
    resolver: zodResolver(officeSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) form.reset(toFormValues(initialValues));
  }, [open, initialValues, form]);

  const submit = async (data) => {
    setSubmitting(true);
    const payload = buildPayload(data, mode === "edit");
    try {
      if (mode === "edit") {
        await API.put(`/offices/${initialValues.id}`, payload);
        toast.success("Office updated", { description: payload.name });
      } else {
        await API.post("/offices", payload);
        toast.success("Office created", { description: payload.name });
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 409 && typeof detail === "string") {
        const field = detail.includes("code") ? "code" : "name";
        form.setError(field, { message: detail });
      } else {
        toast.error("Failed to save office", {
          description: typeof detail === "string" ? detail : "Please try again.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="office-form-dialog">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} noValidate>
            <DialogHeader>
              <DialogTitle>
                {mode === "edit" ? "Edit Office" : "Add Office"}
              </DialogTitle>
              <DialogDescription>
                {mode === "edit"
                  ? "Update the office details below."
                  : "Create a new office. Code and name are required."}
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="office-field-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="office-field-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="(Optional)" {...field} data-testid="office-field-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telephone</FormLabel>
                      <FormControl>
                        <Input placeholder="(Optional)" {...field} data-testid="office-field-telephone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="radius"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Radius (m)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="(Optional)" {...field} data-testid="office-field-radius" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="(Optional)" {...field} data-testid="office-field-latitude" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="(Optional)" {...field} data-testid="office-field-longitude" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Input placeholder="(Optional)" {...field} data-testid="office-field-note" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogBody>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" data-testid="office-form-cancel">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting} data-testid="office-form-submit">
                {submitting ? "Saving..." : mode === "edit" ? "Save changes" : "Save office"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SortableHeader({ column, children, align = "left" }) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className={`flex h-full w-full items-center gap-1 font-medium uppercase tracking-wide ${align === "right" ? "justify-end text-right" : "text-left"}`}
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

export default function OfficesPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [offices, setOffices] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reassignInfo, setReassignInfo] = useState(null);
  const [reassignTarget, setReassignTarget] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  const exportOffices = async (format) => {
    setExportingData(true);
    try {
      const res = await API.get("/offices/export", { params: { format }, responseType: "blob" });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `offices_${stamp}.${format === "xlsx" ? "xlsx" : "csv"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Offices exported");
    } catch {
      toast.error("Failed to export offices");
    } finally {
      setExportingData(false);
    }
  };

  const fetchOffices = useCallback(async () => {
    setStatus("loading");
    try {
      setOffices(await fetchAll("/offices"));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchOffices();
  }, [fetchOffices]);

  const openCreate = () => navigate("/offices/new");
  const openEdit = (office) => navigate(`/offices/${office.id}/edit`);

  const closeDelete = () => {
    setDeleteTarget(null);
    setReassignInfo(null);
    setReassignTarget("");
  };

  const confirmDelete = async () => {
    try {
      await API.delete(`/offices/${deleteTarget.id}`);
      toast.success("Office deleted", { description: deleteTarget.name });
      closeDelete();
      fetchOffices();
    } catch (err) {
      if (err?.response?.status === 409) {
        setReassignInfo({ message: err.response.data.detail });
      } else {
        toast.error(err?.response?.data?.detail || "Failed to delete office");
      }
    }
  };

  const confirmReassignDelete = async () => {
    if (!reassignTarget) return;
    try {
      await API.delete(`/offices/${deleteTarget.id}`, { params: { reassign_to: reassignTarget } });
      toast.success("Users reassigned & office deleted", { description: deleteTarget.name });
      closeDelete();
      fetchOffices();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to reassign & delete");
    }
  };

  const confirmBulkDelete = async () => {
    const ids = table.getFilteredSelectedRowModel().rows.map((r) => r.original.id);
    try {
      await API.post("/offices/bulk-delete", { ids });
      toast.success(`${ids.length} office(s) deleted`);
      setBulkOpen(false);
      setRowSelection({});
      fetchOffices();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete offices");
    }
  };

  const columns = useMemo(
    () => [
      ...(isAdmin ? [{
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
            data-testid="offices-select-all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
      }] : []),
      {
        accessorKey: "code",
        header: ({ column }) => <SortableHeader column={column}>Code</SortableHeader>,
        cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
      },
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      },
      {
        accessorKey: "telephone",
        header: ({ column }) => <SortableHeader column={column}>Telephone</SortableHeader>,
        cell: ({ row }) => row.original.telephone || "—",
      },
      {
        accessorKey: "address",
        header: ({ column }) => <SortableHeader column={column}>Address</SortableHeader>,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.address || "—"}
          </span>
        ),
      },
      {
        accessorKey: "radius",
        header: ({ column }) => (
          <SortableHeader column={column} align="right">Radius</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{row.original.radius} m</div>
        ),
      },
      ...(isAdmin ? [{
        id: "actions",
        cell: ({ row }) => (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Row actions"
                  data-testid={`offices-row-actions-${row.original.id}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard?.writeText(row.original.id);
                    toast.success("Office ID copied", { description: row.original.id });
                  }}
                  data-testid={`offices-copy-id-${row.original.id}`}
                >
                  <Copy className="size-4" /> Copy ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => openEdit(row.original)}
                  data-testid={`offices-edit-${row.original.id}`}
                >
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteTarget(row.original)}
                  data-testid={`offices-delete-${row.original.id}`}
                >
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        enableSorting: false,
      }] : []),
    ],
    [isAdmin],
  );

  const table = useReactTable({
    data: offices,
    columns,
    state: { sorting, globalFilter, rowSelection },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const hasSearch = globalFilter.trim().length > 0;

  return (
    <div className="space-y-6" data-testid="offices-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Office List</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportOpen(true)}
                  data-testid="offices-import"
                >
                  <Upload className="size-4" /> Import
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={exportingData} data-testid="offices-export">
                      <Download className="size-4" /> Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportOffices("xlsx")} data-testid="offices-export-xlsx">
                      <Download className="size-4" /> Export (Excel)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportOffices("csv")} data-testid="offices-export-csv">
                      <Download className="size-4" /> Export (CSV)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" onClick={openCreate} data-testid="offices-add">
                  <Plus className="size-4" /> Add Office
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-[15rem]">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search..."
                className="h-[var(--ctl-h-sm)] pl-8 text-xs"
                data-testid="offices-search"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && selectedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkOpen(true)}
                  className="border-destructive/50 text-destructive hover:text-destructive"
                  data-testid="offices-bulk-delete"
                >
                  <Trash2 className="size-4" /> Delete ({selectedCount})
                </Button>
              )}
              {hasSearch && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGlobalFilter("")}
                  data-testid="offices-reset"
                >
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
              <Button variant="outline" size="sm" onClick={fetchOffices} data-testid="offices-retry">
                <RefreshCw className="size-4" /> Try again
              </Button>
            }
          />
        ) : status === "loading" ? (
          <div className="space-y-2 p-4" data-testid="offices-loading">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : offices.length === 0 ? (
          <EmptyState
            variant="first-time"
            title="No offices yet"
            description="Create your first office to get started."
            action={
              isAdmin ? (
                <Button size="sm" onClick={openCreate} data-testid="offices-empty-add">
                  <Plus className="size-4" /> Add Office
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table data-testid="offices-table" className="tbl-density [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                    {hg.headers.map((h) => (
                      <TableHead key={h.id}>
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2" data-testid="offices-empty-filtered">
                        <span>No offices match your search.</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setGlobalFilter("")}
                          data-testid="offices-clear-search"
                        >
                          <FilterX className="size-4" /> Reset
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </div>

      {/* Footer (only when there are rows) */}
      {status === "ready" && offices.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-[var(--ctl-h-sm)] w-[70px]" data-testid="offices-page-size">
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
                className="size-[var(--ctl-h-sm)]"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-[var(--ctl-h-sm)]"
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

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Offices"
        resource="offices"
        templateFilename="offices_import_template.xlsx"
        instructions="Upload an .xlsx file with columns: code, name, address, telephone, longitude, latitude, radius, note. Existing offices (matched by code) are updated. All rows are validated first — if any row fails, nothing is imported."
        onImported={fetchOffices}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && closeDelete()}>
        <AlertDialogContent data-testid="offices-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reassignInfo ? "Reassign users before deleting" : "Delete office?"}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 px-6 py-4">
            {reassignInfo ? (
              <>
                <AlertDialogDescription>
                  {reassignInfo.message} Choose an office to move them to, then delete.
                </AlertDialogDescription>
                <Select value={reassignTarget} onValueChange={setReassignTarget}>
                  <SelectTrigger data-testid="offices-reassign-target">
                    <SelectValue placeholder="Select target office" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices
                      .filter((o) => o.id !== deleteTarget?.id)
                      .map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <AlertDialogDescription>
                This will permanently remove{" "}
                <span className="font-medium text-foreground">{deleteTarget?.name}</span>. This
                action cannot be undone.
              </AlertDialogDescription>
            )}
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={closeDelete} data-testid="offices-delete-cancel">
              Cancel
            </Button>
            {reassignInfo ? (
              <Button
                onClick={confirmReassignDelete}
                disabled={!reassignTarget}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="offices-reassign-confirm"
              >
                Reassign &amp; delete
              </Button>
            ) : (
              <Button
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="offices-delete-confirm"
              >
                Delete
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent data-testid="offices-bulk-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} office(s)?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4">
            <AlertDialogDescription>
              This will permanently remove the selected offices. This action cannot
              be undone.
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="offices-bulk-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="offices-bulk-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
