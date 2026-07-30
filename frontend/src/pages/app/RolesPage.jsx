import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import API from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/composite/EmptyState";
import { DensityToggle } from "@/components/density-toggle";

const NONE = "__none__";

const roleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  parent_id: z.string().optional(),
});

/** Build a pre-order (tree) ordering with depth + ancestor chain per role. */
function buildTree(roles) {
  const byParent = {};
  const ids = new Set(roles.map((r) => r.id));
  roles.forEach((r) => {
    const key = r.parent_id && ids.has(r.parent_id) ? r.parent_id : "__root__";
    (byParent[key] ||= []).push(r);
  });
  Object.values(byParent).forEach((list) =>
    list.sort((a, b) => a.name.localeCompare(b.name)),
  );

  const out = [];
  const walk = (key, depth, chain) => {
    (byParent[key] || []).forEach((r) => {
      out.push({ ...r, _depth: depth, _chain: chain });
      walk(r.id, depth + 1, [...chain, r.name]);
    });
  };
  walk("__root__", 0, []);
  return out;
}

/** Ids of a role's descendants (to prevent choosing them as parent). */
function descendantIds(roles, rootId) {
  const out = new Set();
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop();
    roles.forEach((r) => {
      if (r.parent_id === cur && !out.has(r.id)) {
        out.add(r.id);
        stack.push(r.id);
      }
    });
  }
  return out;
}

function RoleFormDialog({ open, onOpenChange, editing, roles, onSaved }) {
  const form = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", parent_id: NONE },
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      form.reset({
        name: editing?.name || "",
        parent_id: editing?.parent_id || NONE,
      });
    }
  }, [open, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const parentOptions = useMemo(() => {
    if (!editing) return roles;
    const blocked = descendantIds(roles, editing.id);
    return roles.filter((r) => r.id !== editing.id && !blocked.has(r.id));
  }, [roles, editing]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    const payload = {
      name: data.name.trim(),
      parent_id: data.parent_id && data.parent_id !== NONE ? data.parent_id : null,
    };
    try {
      if (editing) {
        await API.put(`/roles/${editing.id}`, payload);
        toast.success("Role updated");
      } else {
        await API.post("/roles", payload);
        toast.success("Role created");
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save role");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="role-form-dialog">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit role" : "Add role"}</DialogTitle>
          <DialogDescription>
            A role represents a position (jabatan). Pick a direct superior to place
            it in the hierarchy.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-[var(--field-gap)] py-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="role-name-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direct superior (Optional)</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="role-parent-select">
                          <SelectValue placeholder="(Optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>None (top level)</SelectItem>
                        {parentOptions.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="role-form-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} data-testid="role-form-submit">
                {submitting ? "Saving..." : "Save role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [status, setStatus] = useState("loading");
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = async () => {
    setStatus("loading");
    try {
      const { data } = await API.get("/roles");
      setRoles(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const treeData = useMemo(() => buildTree(roles), [roles]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (role) => {
    setEditing(role);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await API.delete(`/roles/${deleteTarget.id}`);
      toast.success("Role deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete role");
    }
  };

  const confirmBulkDelete = async () => {
    const ids = table
      .getSelectedRowModel()
      .rows.map((r) => r.original.id);
    try {
      await API.post("/roles/bulk-delete", { ids });
      toast.success(`Deleted ${ids.length} role(s)`);
      setRowSelection({});
      setBulkOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete roles");
    }
  };

  const columns = useMemo(
    () => [
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
            data-testid="roles-select-all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
            data-testid={`roles-select-${row.original.id}`}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
          const d = row.original._depth || 0;
          return (
            <div className="flex items-center" style={{ paddingLeft: d * 20 }}>
              {d > 0 && (
                <ChevronRight
                  className="mr-1 size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <span className="font-medium">{row.original.name}</span>
            </div>
          );
        },
      },
      {
        id: "superior",
        header: "Direct superior",
        cell: ({ row }) => {
          const chain = row.original._chain || [];
          const parent = chain.length ? chain[chain.length - 1] : null;
          return (
            <span className="text-muted-foreground">{parent || "—"}</span>
          );
        },
      },
      {
        id: "chain",
        header: "Superiors (top ↑)",
        cell: ({ row }) => {
          const chain = [...(row.original._chain || [])].reverse();
          if (!chain.length)
            return <span className="text-muted-foreground">Top level</span>;
          return (
            <span className="text-muted-foreground">{chain.join(" › ")}</span>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Row actions"
                data-testid={`roles-row-actions-${row.original.id}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => openEdit(row.original)}
                data-testid={`roles-edit-${row.original.id}`}
              >
                <Pencil className="size-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTarget(row.original)}
                data-testid={`roles-delete-${row.original.id}`}
              >
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: treeData,
    columns,
    state: { globalFilter, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    globalFilterFn: (row, _col, value) =>
      row.original.name.toLowerCase().includes(value.toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedCount = table.getSelectedRowModel().rows.length;
  const colSpan = columns.length;

  return (
    <div className="space-y-6" data-testid="roles-page">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Roles</CardTitle>
          <Button size="sm" onClick={openCreate} data-testid="roles-add">
            <Plus className="size-4" /> Add Role
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search roles..."
                className="pl-8"
                data-testid="roles-search"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkOpen(true)}
                  className="border-destructive/50 text-destructive hover:text-destructive"
                  data-testid="roles-bulk-delete"
                >
                  <Trash2 className="size-4" /> Delete ({selectedCount})
                </Button>
              )}
              <DensityToggle />
            </div>
          </div>

          <div className="rounded-md border">
            {status === "loading" ? (
              <div className="space-y-2 p-4" data-testid="roles-loading">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : status === "error" ? (
              <div className="p-6">
                <EmptyState
                  title="Couldn't load roles"
                  description="Something went wrong while fetching roles."
                  action={
                    <Button onClick={load} data-testid="roles-retry">
                      Retry
                    </Button>
                  }
                />
              </div>
            ) : roles.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No roles yet"
                  description="Create your first role to start building the hierarchy."
                  action={
                    <Button onClick={openCreate} data-testid="roles-empty-add">
                      <Plus className="size-4" /> Add Role
                    </Button>
                  }
                />
              </div>
            ) : (
              <Table
                data-testid="roles-table"
                className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap"
              >
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => (
                        <TableHead key={h.id}>
                          {h.isPlaceholder
                            ? null
                            : flexRender(
                                h.column.columnDef.header,
                                h.getContext(),
                              )}
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
                        data-testid={`roles-row-${row.original.id}`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
                        No roles match your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {status === "ready" && roles.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground" data-testid="roles-count">
                {selectedCount > 0 ? `${selectedCount} selected · ` : ""}
                {table.getFilteredRowModel().rows.length} of {roles.length} roles
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  data-testid="roles-prev-page"
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount() || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  data-testid="roles-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <RoleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        roles={roles}
        onSaved={load}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent data-testid="roles-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{deleteTarget?.name}". Any direct subordinates
              will be moved up to its superior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="roles-delete-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="roles-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent data-testid="roles-bulk-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} role(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Subordinates of deleted roles will be moved up to the nearest
              surviving superior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="roles-bulk-delete-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="roles-bulk-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
