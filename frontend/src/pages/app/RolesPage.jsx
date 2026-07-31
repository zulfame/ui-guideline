import React, { useEffect, useMemo, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  Layers,
  MoreHorizontal,
  Network,
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
  DialogBody,
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
import { Combobox } from "@/components/composite/Combobox";
import { OrgChart } from "@/components/composite/OrgChart";
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
  dotted_parent_id: z.string().optional(),
  level_id: z.string().optional(),
  order: z.coerce.number().int("Whole number").min(0, "Must be ≥ 0"),
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
    list.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
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

function RoleFormDialog({ open, onOpenChange, editing, roles, levels, onSaved }) {
  const form = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      parent_id: NONE,
      dotted_parent_id: NONE,
      level_id: NONE,
      order: 0,
    },
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      form.reset({
        name: editing?.name || "",
        parent_id: editing?.parent_id || NONE,
        dotted_parent_id: editing?.dotted_parent_id || NONE,
        level_id: editing?.level_id || NONE,
        order: editing?.order ?? 0,
      });
    }
  }, [open, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const parentOptions = useMemo(() => {
    if (!editing) return roles;
    const blocked = descendantIds(roles, editing.id);
    return roles.filter((r) => r.id !== editing.id && !blocked.has(r.id));
  }, [roles, editing]);

  const parentComboOptions = useMemo(
    () => [
      { value: NONE, label: "None (top level)" },
      ...parentOptions.map((r) => ({ value: r.id, label: r.name })),
    ],
    [parentOptions],
  );

  const dottedComboOptions = useMemo(
    () => [
      { value: NONE, label: "None" },
      ...roles
        .filter((r) => r.id !== editing?.id)
        .map((r) => ({ value: r.id, label: r.name })),
    ],
    [roles, editing],
  );

  const levelComboOptions = useMemo(
    () => [
      { value: NONE, label: "None" },
      ...levels.map((l) => ({ value: l.id, label: l.name })),
    ],
    [levels],
  );

  const onSubmit = async (data) => {
    setSubmitting(true);
    const clean = (v) => (v && v !== NONE ? v : null);
    const payload = {
      name: data.name.trim(),
      parent_id: clean(data.parent_id),
      dotted_parent_id: clean(data.dotted_parent_id),
      level_id: clean(data.level_id),
      order: Number(data.order) || 0,
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit role" : "Add role"}</DialogTitle>
              <DialogDescription>
                A role represents a position (jabatan). Configure its superior,
                level and order to place it in the org chart.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Direct superior (Optional)</FormLabel>
                    <Combobox
                      options={parentComboOptions}
                      value={field.value || NONE}
                      onChange={(v) => field.onChange(v || NONE)}
                      placeholder="(Optional)"
                      searchPlaceholder="Search role..."
                      emptyText="No role found."
                      data-testid="role-parent-select"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dotted_parent_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Dotted-line superior (Optional)</FormLabel>
                    <Combobox
                      options={dottedComboOptions}
                      value={field.value || NONE}
                      onChange={(v) => field.onChange(v || NONE)}
                      placeholder="(Optional)"
                      searchPlaceholder="Search role..."
                      emptyText="No role found."
                      data-testid="role-dotted-select"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="level_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Level (Optional)</FormLabel>
                      <Combobox
                        options={levelComboOptions}
                        value={field.value || NONE}
                        onChange={(v) => field.onChange(v || NONE)}
                        placeholder="(Optional)"
                        searchPlaceholder="Search level..."
                        emptyText="No level found."
                        data-testid="role-level-select"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order (left→right)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          data-testid="role-order-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </DialogBody>
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

function LevelManagerDialog({ open, onOpenChange, levels, onChanged }) {
  const [drafts, setDrafts] = useState({});
  const [newLevel, setNewLevel] = useState({ name: "", order: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      const d = {};
      levels.forEach((l) => (d[l.id] = { name: l.name, order: l.order }));
      setDrafts(d);
      const nextOrder = levels.length
        ? Math.max(...levels.map((l) => Number(l.order) || 0)) + 1
        : 1;
      setNewLevel({ name: "", order: nextOrder });
    }
  }, [open, levels]);

  const setDraft = (id, patch) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const saveLevel = async (id) => {
    const d = drafts[id];
    if (!d?.name?.trim()) return toast.error("Level name is required");
    setBusy(true);
    try {
      await API.put(`/levels/${id}`, {
        name: d.name.trim(),
        order: Number(d.order) || 0,
      });
      toast.success("Level updated");
      onChanged();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update level");
    } finally {
      setBusy(false);
    }
  };

  const deleteLevel = async (id) => {
    setBusy(true);
    try {
      await API.delete(`/levels/${id}`);
      toast.success("Level deleted");
      onChanged();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete level");
    } finally {
      setBusy(false);
    }
  };

  const addLevel = async () => {
    if (!newLevel.name.trim()) return toast.error("Level name is required");
    setBusy(true);
    try {
      await API.post("/levels", {
        name: newLevel.name.trim(),
        order: Number(newLevel.order) || 0,
      });
      toast.success("Level created");
      onChanged();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create level");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="levels-dialog">
        <DialogHeader>
          <DialogTitle>Manage levels</DialogTitle>
          <DialogDescription>
            Levels define the org-chart swimlanes (e.g. Direktur, Kepala Bagian,
            Kepala Seksi). Lower order appears higher in the chart.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[60vh] space-y-3 overflow-auto">
          <div className="grid grid-cols-[1fr_5rem_auto] items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>Name</span>
            <span>Order</span>
            <span className="sr-only">Actions</span>
          </div>
          {levels.length === 0 ? (
            <p className="text-sm text-muted-foreground">No levels yet.</p>
          ) : (
            levels.map((l) => (
              <div
                key={l.id}
                className="grid grid-cols-[1fr_5rem_auto] items-center gap-2"
                data-testid={`level-row-${l.id}`}
              >
                <Input
                  value={drafts[l.id]?.name ?? ""}
                  onChange={(e) => setDraft(l.id, { name: e.target.value })}
                  data-testid={`level-name-${l.id}`}
                />
                <Input
                  type="number"
                  min={0}
                  value={drafts[l.id]?.order ?? 0}
                  onChange={(e) => setDraft(l.id, { order: e.target.value })}
                  data-testid={`level-order-${l.id}`}
                />
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => saveLevel(l.id)}
                    data-testid={`level-save-${l.id}`}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    disabled={busy}
                    onClick={() => deleteLevel(l.id)}
                    aria-label="Delete level"
                    data-testid={`level-delete-${l.id}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
          <div className="border-t pt-3">
            <div className="grid grid-cols-[1fr_5rem_auto] items-center gap-2">
              <Input
                placeholder="New level name"
                value={newLevel.name}
                onChange={(e) =>
                  setNewLevel((p) => ({ ...p, name: e.target.value }))
                }
                data-testid="level-new-name"
              />
              <Input
                type="number"
                min={0}
                value={newLevel.order}
                onChange={(e) =>
                  setNewLevel((p) => ({ ...p, order: e.target.value }))
                }
                data-testid="level-new-order"
              />
              <Button
                size="sm"
                disabled={busy}
                onClick={addLevel}
                data-testid="level-add"
              >
                <Plus className="size-4" /> Add
              </Button>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="levels-close"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [levels, setLevels] = useState([]);
  const [status, setStatus] = useState("loading");
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);

  const loadLevels = async () => {
    try {
      const { data } = await API.get("/levels");
      setLevels(data);
    } catch {
      /* levels are optional; ignore */
    }
  };

  const load = async () => {
    setStatus("loading");
    try {
      const [rolesRes] = await Promise.all([API.get("/roles"), loadLevels()]);
      setRoles(rolesRes.data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const levelName = useMemo(() => {
    const m = {};
    levels.forEach((l) => (m[l.id] = l.name));
    return m;
  }, [levels]);

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
    const ids = table.getSelectedRowModel().rows.map((r) => r.original.id);
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
          return <span className="text-muted-foreground">{parent || "—"}</span>;
        },
      },
      {
        id: "level",
        header: "Level",
        cell: ({ row }) => {
          const name = levelName[row.original.level_id];
          return <span className="text-muted-foreground">{name || "—"}</span>;
        },
      },
      {
        id: "order",
        header: "Order",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.order ?? 0}</span>
        ),
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
    [levelName],
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
    initialState: { pagination: { pageSize: 10 } },
  });

  const selectedCount = table.getSelectedRowModel().rows.length;
  const colSpan = columns.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-6" data-testid="roles-page">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Role List</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLevelsOpen(true)}
              data-testid="roles-levels-btn"
            >
              <Layers className="size-4" /> Levels
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStructureOpen(true)}
              data-testid="roles-structure-btn"
            >
              <Network className="size-4" /> Structure
            </Button>
            <Button size="sm" onClick={openCreate} data-testid="roles-add">
              <Plus className="size-4" /> Add Role
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => table.setPageSize(Number(v))}
                >
                  <SelectTrigger className="h-8 w-[70px]" data-testid="roles-page-size">
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
                <span>of {totalRows} rows</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-xs text-muted-foreground" data-testid="roles-count">
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
                    data-testid="roles-prev-page"
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
                    data-testid="roles-next-page"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
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
        levels={levels}
        onSaved={load}
      />

      <LevelManagerDialog
        open={levelsOpen}
        onOpenChange={setLevelsOpen}
        levels={levels}
        onChanged={loadLevels}
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

      <Dialog open={structureOpen} onOpenChange={setStructureOpen}>
        <DialogContent
          className="w-[95vw] max-w-[95vw]"
          data-testid="roles-structure-dialog"
        >
          <DialogHeader>
            <DialogTitle>Role structure</DialogTitle>
            <DialogDescription>
              Org chart per level (swimlane). Solid = atasan langsung, garis
              putus-putus = atasan dotted-line.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[75vh] overflow-auto">
            <OrgChart roles={roles} levels={levels} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
