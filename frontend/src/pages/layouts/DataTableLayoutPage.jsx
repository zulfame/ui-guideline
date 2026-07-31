import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FilterX,
  ListFilter,
  MoreHorizontal,
  Pencil,
  Plus,
  Rows3,
  Search,
  Trash2,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { SAMPLE_USERS, USER_ROLES, USER_STATUSES } from "@/config/sampleData";

// CRUD form schema (create + edit share the same shape).
const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  role: z.string().min(1, "Please select a role"),
  status: z.string().min(1, "Please select a status"),
});

const EMPTY_USER = { name: "", email: "", role: "", status: "Active" };

// Add/Edit user dialog (header/body/footer divider pattern, rhf+zod).
function UserFormDialog({ open, onOpenChange, mode, initialValues, onSubmit }) {
  const form = useForm({ resolver: zodResolver(userSchema), defaultValues: initialValues });

  useEffect(() => {
    if (open) form.reset(initialValues);
  }, [open, initialValues, form]);

  const submit = (data) => {
    onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="user-form-dialog">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} noValidate>
            <DialogHeader>
              <DialogTitle>{mode === "edit" ? "Edit User" : "Add User"}</DialogTitle>
              <DialogDescription>
                {mode === "edit"
                  ? "Update the user details below."
                  : "Create a new user account. All fields are required."}
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {USER_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {USER_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" data-testid="user-form-cancel">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" data-testid="user-form-submit">
                {mode === "edit" ? "Save changes" : "Save user"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Row density presets (Data Table 1 pattern). Default = compact (R39).
const DENSITY = {
  compact: { label: "Compact", cell: "py-1", head: "h-8" },
  standard: { label: "Standard", cell: "py-2", head: "h-10" },
  comfortable: { label: "Comfortable", cell: "py-3", head: "h-12" },
};

// Consistent sortable header — fills the whole th cell (hover covers full block).
function SortableHeader({ column, children }) {
  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className="h-full w-full justify-start gap-1 rounded-none px-2 font-medium text-muted-foreground hover:text-foreground"
      data-testid={`dt-sort-${column.id}`}
    >
      {children}
      <Icon className="ml-1 size-3.5" />
    </Button>
  );
}

// Faceted multi-select filter for a column (toolbar).
function FacetedFilter({ column, title, options }) {
  const selected = new Set(column?.getFilterValue() ?? []);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-dashed"
          data-testid={`dt-filter-${title.toLowerCase()}`}
        >
          <ListFilter className="size-4" /> {title}
          {selected.size > 0 && (
            <Badge variant="secondary" className="ml-1 rounded-sm px-1 font-normal">
              {selected.size}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt}
            checked={selected.has(opt)}
            onCheckedChange={(v) => {
              const next = new Set(selected);
              v ? next.add(opt) : next.delete(opt);
              column?.setFilterValue(next.size ? Array.from(next) : undefined);
            }}
            data-testid={`dt-filter-${title.toLowerCase()}-${opt.toLowerCase()}`}
          >
            {opt}
          </DropdownMenuCheckboxItem>
        ))}
        {selected.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => column?.setFilterValue(undefined)}
              className="justify-center text-xs"
            >
              Clear
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const multiSelectFilter = (row, id, value) => value.includes(row.getValue(id));

const columns = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        aria-label="Select all"
        data-testid="dt-select-all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label={`Select ${row.original.name}`}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "email",
    header: ({ column }) => <SortableHeader column={column}>Email</SortableHeader>,
  },
  {
    accessorKey: "role",
    header: ({ column }) => <SortableHeader column={column}>Role</SortableHeader>,
    filterFn: multiSelectFilter,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
    filterFn: multiSelectFilter,
    cell: ({ getValue }) => (
      <Badge variant={getValue() === "Active" ? "default" : "outline"}>
        {getValue()}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row, table }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Actions for ${row.original.name}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => table.options.meta.onView(row.original)}>
            <Eye className="size-4" /> View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => table.options.meta.onEdit(row.original)}>
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => table.options.meta.onDelete(row.original)}
          >
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableSorting: false,
  },
];

export default function DataTableLayoutPage() {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [density, setDensity] = useState(
    () => localStorage.getItem("dt-density") || "compact",
  );

  // CRUD state (local only — no backend persistence).
  const [rows, setRows] = useState(SAMPLE_USERS);
  const [dialog, setDialog] = useState({ open: false, mode: "add", user: EMPTY_USER });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("dt-density", density);
  }, [density]);

  const openAdd = () => setDialog({ open: true, mode: "add", user: EMPTY_USER });
  const openEdit = (user) => setDialog({ open: true, mode: "edit", user });

  const handleSubmit = (data) => {
    if (dialog.mode === "add") {
      setRows((prev) => [{ id: Date.now(), ...data }, ...prev]);
      toast.success("User created", { description: data.email });
    } else {
      setRows((prev) =>
        prev.map((u) => (u.id === dialog.user.id ? { ...u, ...data } : u)),
      );
      toast.success("User updated", { description: data.email });
    }
  };

  const confirmDelete = () => {
    setRows((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    toast.success("User deleted", { description: deleteTarget.name });
    setDeleteTarget(null);
  };

  const confirmBulkDelete = () => {
    const ids = new Set(
      table.getFilteredSelectedRowModel().rows.map((r) => r.original.id),
    );
    setRows((prev) => prev.filter((u) => !ids.has(u.id)));
    toast.success(`${ids.size} user(s) deleted`);
    setRowSelection({});
    setBulkDeleteOpen(false);
  };

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, columnFilters, rowSelection },
    getRowId: (row) => String(row.id),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
    meta: {
      onView: (u) => toast("View user", { description: `${u.name} · ${u.email}` }),
      onEdit: openEdit,
      onDelete: (u) => setDeleteTarget(u),
    },
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;

  const hasActiveFilters = globalFilter.trim().length > 0 || columnFilters.length > 0;
  const clearFilters = () => {
    setGlobalFilter("");
    setColumnFilters([]);
  };

  return (
    <div className="space-y-6" data-testid="datatable-layout-page">
      <PageHeader
        title="DataTable"
        description="A complete data table layout: toolbar, selection, sorting, and pagination."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Users</CardTitle>
          <Button size="sm" onClick={openAdd} data-testid="dt-add">
            <Plus className="size-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-8"
                data-testid="dt-search"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  className="border-destructive/50 text-destructive hover:text-destructive"
                  data-testid="dt-bulk-delete"
                >
                  <Trash2 className="size-4" /> Delete ({selectedCount})
                </Button>
              )}
              <FacetedFilter
                column={table.getColumn("role")}
                title="Role"
                options={USER_ROLES}
              />
              <FacetedFilter
                column={table.getColumn("status")}
                title="Status"
                options={USER_STATUSES}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="dt-density">
                    <Rows3 className="size-4" /> Density
                    <ChevronDown className="size-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Row density</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={density} onValueChange={setDensity}>
                    {Object.entries(DENSITY).map(([key, { label }]) => (
                      <DropdownMenuRadioItem
                        key={key}
                        value={key}
                        data-testid={`dt-density-${key}`}
                      >
                        {label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table data-testid="dt-table">
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                    {hg.headers.map((h) => (
                      <TableHead
                        key={h.id}
                        aria-sort={
                          h.column.getCanSort()
                            ? { asc: "ascending", desc: "descending" }[
                                h.column.getIsSorted()
                              ] || "none"
                            : undefined
                        }
                        className={cn(
                          DENSITY[density].head,
                          h.column.getCanSort() && "p-0",
                        )}
                      >
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
                  table.getRowModel().rows.map((r) => (
                    <TableRow key={r.id} data-state={r.getIsSelected() && "selected"}>
                      {r.getVisibleCells().map((c) => (
                        <TableCell key={c.id} className={DENSITY[density].cell}>
                          {flexRender(c.column.columnDef.cell, c.getContext())}
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
                      {hasActiveFilters ? (
                        <div
                          className="flex flex-col items-center gap-2"
                          data-testid="dt-empty-filtered"
                        >
                          <span>No users match your filters.</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearFilters}
                            data-testid="dt-clear-filters"
                          >
                            <FilterX className="size-4" /> Clear filters
                          </Button>
                        </div>
                      ) : (
                        "No Data Available"
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => table.setPageSize(Number(v))}
              >
                <SelectTrigger className="h-8 w-[70px]" data-testid="dt-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[8, 16, 24].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span data-testid="dt-showing">of {totalRows} rows</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-xs text-muted-foreground">
                Page {pageIndex + 1} of {table.getPageCount()}
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
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <UserFormDialog
        open={dialog.open}
        onOpenChange={(v) => setDialog((d) => ({ ...d, open: v }))}
        mode={dialog.mode}
        initialValues={dialog.user}
        onSubmit={handleSubmit}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent data-testid="dt-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4">
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="dt-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="dt-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent data-testid="dt-bulk-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} user(s)?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4">
            <AlertDialogDescription>
              This will permanently remove the selected users. This action cannot
              be undone.
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="dt-bulk-delete-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="dt-bulk-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
