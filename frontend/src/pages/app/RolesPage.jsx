import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileImage,
  FileText,
  FilterX,
  Layers,
  MoreHorizontal,
  Network,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import API, { fetchAll } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
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
  DropdownMenuSeparator,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { ImportDialog } from "@/components/composite/ImportDialog";
import { DensityToggle } from "@/components/density-toggle";

const NONE = "__none__";

// Roles that grant full access and must never be deleted (match by name).
const isProtectedRole = (name) => (name || "").trim().toLowerCase() === "super admin";

const PALETTE = [
  // guard-allow: org-chart swimlane colors are user-facing data, not design tokens
  { name: "Blue", hex: "#3b82f6" }, // guard-allow
  { name: "Cyan", hex: "#06b6d4" }, // guard-allow
  { name: "Teal", hex: "#14b8a6" }, // guard-allow
  { name: "Green", hex: "#22c55e" }, // guard-allow
  { name: "Lime", hex: "#84cc16" }, // guard-allow
  { name: "Amber", hex: "#f59e0b" }, // guard-allow
  { name: "Orange", hex: "#f97316" }, // guard-allow
  { name: "Rose", hex: "#f43f5e" }, // guard-allow
  { name: "Violet", hex: "#8b5cf6" }, // guard-allow
  { name: "Slate", hex: "#64748b" }, // guard-allow
];

function ColorSwatch({ value, onChange, testid }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="size-8 shrink-0 rounded-md border"
          style={{ backgroundColor: value || "transparent" }}
          aria-label="Pick color"
          data-testid={testid}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-5 gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => {
                onChange(c.hex);
                setOpen(false);
              }}
              className="size-6 rounded-md border"
              style={{ backgroundColor: c.hex }}
              aria-label={c.name}
              title={c.name}
              data-testid={`swatch-${c.name.toLowerCase()}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
          className="mt-2 w-full rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        >
          No color
        </button>
      </PopoverContent>
    </Popover>
  );
}


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
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="parent_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Direct superior</FormLabel>
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
                    <FormItem>
                      <FormLabel>Dotted-line superior</FormLabel>
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
              </div>
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="level_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level</FormLabel>
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
  const [newLevel, setNewLevel] = useState({ name: "", order: 0, color: null });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      const d = {};
      levels.forEach((l) => (d[l.id] = { name: l.name, order: l.order, color: l.color || null }));
      setDrafts(d);
      const nextOrder = levels.length
        ? Math.max(...levels.map((l) => Number(l.order) || 0)) + 1
        : 1;
      setNewLevel({ name: "", order: nextOrder, color: null });
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
        color: d.color || null,
      });
      toast.success("Level updated");
      onChanged();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update level");
    } finally {
      setBusy(false);
    }
  };

  const setColorNow = async (id, hex) => {
    setDraft(id, { color: hex });
    try {
      await API.put(`/levels/${id}`, { color: hex });
      onChanged();
    } catch {
      toast.error("Failed to set color");
    }
  };

  const moveLevel = async (index, dir) => {
    const a = levels[index];
    const b = levels[index + dir];
    if (!a || !b) return;
    setBusy(true);
    try {
      const aOrder = Number(a.order) || 0;
      const bOrder = Number(b.order) || 0;
      await Promise.all([
        API.put(`/levels/${a.id}`, { order: bOrder }),
        API.put(`/levels/${b.id}`, { order: aOrder }),
      ]);
      onChanged();
    } catch {
      toast.error("Failed to reorder level");
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
        color: newLevel.color || null,
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
      <DialogContent className="sm:max-w-2xl" data-testid="levels-dialog">
        <DialogHeader>
          <DialogTitle>Manage levels</DialogTitle>
          <DialogDescription>
            Levels define the org-chart swimlanes (e.g. Direktur, Kepala Bagian,
            Kepala Seksi). Use the arrows to reorder; pick a color for each swimlane.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[60vh] space-y-2 overflow-auto">
          {levels.length === 0 ? (
            <p className="text-sm text-muted-foreground">No levels yet.</p>
          ) : (
            levels.map((l, i) => (
              <div
                key={l.id}
                className="flex items-center gap-2"
                data-testid={`level-row-${l.id}`}
              >
                <ColorSwatch
                  value={drafts[l.id]?.color ?? null}
                  onChange={(hex) => setColorNow(l.id, hex)}
                  testid={`level-color-${l.id}`}
                />
                <Input
                  value={drafts[l.id]?.name ?? ""}
                  onChange={(e) => setDraft(l.id, { name: e.target.value })}
                  className="flex-1"
                  data-testid={`level-name-${l.id}`}
                />
                <Input
                  type="number"
                  min={0}
                  value={drafts[l.id]?.order ?? 0}
                  onChange={(e) => setDraft(l.id, { order: e.target.value })}
                  className="w-16"
                  data-testid={`level-order-${l.id}`}
                />
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={busy || i === 0}
                    onClick={() => moveLevel(i, -1)}
                    aria-label="Move level up"
                    data-testid={`level-up-${l.id}`}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={busy || i === levels.length - 1}
                    onClick={() => moveLevel(i, 1)}
                    aria-label="Move level down"
                    data-testid={`level-down-${l.id}`}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
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
            ))
          )}
          <div className="mt-1 flex items-center gap-2 border-t pt-3">
            <ColorSwatch
              value={newLevel.color}
              onChange={(hex) => setNewLevel((p) => ({ ...p, color: hex }))}
              testid="level-new-color"
            />
            <Input
              placeholder="New level name"
              value={newLevel.name}
              onChange={(e) => setNewLevel((p) => ({ ...p, name: e.target.value }))}
              className="flex-1"
              data-testid="level-new-name"
            />
            <Input
              type="number"
              min={0}
              value={newLevel.order}
              onChange={(e) => setNewLevel((p) => ({ ...p, order: e.target.value }))}
              className="w-16"
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

export default function RolesPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [levels, setLevels] = useState([]);
  const [status, setStatus] = useState("loading");
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reassignInfo, setReassignInfo] = useState(null);
  const [reassignTarget, setReassignTarget] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const orgRef = useRef(null);
  const [exportingChart, setExportingChart] = useState(false);

  const handleExport = async (kind) => {
    if (!orgRef.current) return;
    setExportingChart(true);
    try {
      await (kind === "png" ? orgRef.current.exportPng() : orgRef.current.exportPdf());
    } catch {
      toast.error("Failed to export chart");
    } finally {
      setExportingChart(false);
    }
  };
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  const exportRoles = async (format) => {
    setExportingData(true);
    try {
      const res = await API.get("/roles/export", { params: { format }, responseType: "blob" });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `roles_${stamp}.${format === "xlsx" ? "xlsx" : "csv"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Roles exported");
    } catch {
      toast.error("Failed to export roles");
    } finally {
      setExportingData(false);
    }
  };

  const loadLevels = async () => {
    try {
      setLevels(await fetchAll("/levels"));
    } catch {
      /* levels are optional; ignore */
    }
  };

  const load = async () => {
    setStatus("loading");
    try {
      const [allRoles] = await Promise.all([
        fetchAll("/roles"),
        loadLevels(),
      ]);
      setRoles(allRoles);
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

  const openCreate = () => navigate("/roles/new");
  const openEdit = (role) => navigate(`/roles/${role.id}/edit`);

  const moveRole = async (role, dir) => {
    const sibs = roles
      .filter((r) => (r.level_id || null) === (role.level_id || null))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    const idx = sibs.findIndex((r) => r.id === role.id);
    const j = idx + dir;
    if (j < 0 || j >= sibs.length) return;
    const arr = [...sibs];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    try {
      await Promise.all(
        arr
          .map((r, k) =>
            (Number(r.order) || 0) !== k ? API.put(`/roles/${r.id}`, { order: k }) : null,
          )
          .filter(Boolean),
      );
      load();
    } catch {
      toast.error("Failed to reorder role");
    }
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setReassignInfo(null);
    setReassignTarget("");
  };

  const confirmDelete = async () => {
    try {
      await API.delete(`/roles/${deleteTarget.id}`);
      toast.success("Role deleted");
      closeDelete();
      load();
    } catch (err) {
      if (err?.response?.status === 409) {
        setReassignInfo({ message: err.response.data.detail });
      } else {
        toast.error(err?.response?.data?.detail || "Failed to delete role");
      }
    }
  };

  const confirmReassignDelete = async () => {
    if (!reassignTarget) return;
    try {
      await API.delete(`/roles/${deleteTarget.id}`, { params: { reassign_to: reassignTarget } });
      toast.success("Users reassigned & role deleted");
      closeDelete();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to reassign & delete");
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
            data-testid="roles-select-all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            disabled={isProtectedRole(row.original.name)}
            aria-label="Select row"
            data-testid={`roles-select-${row.original.id}`}
          />
        ),
        enableSorting: false,
      }] : []),
      {
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
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
        accessorFn: (row) => {
          const chain = row._chain || [];
          return chain.length ? chain[chain.length - 1] : "";
        },
        header: ({ column }) => <SortableHeader column={column}>Direct superior</SortableHeader>,
        cell: ({ row }) => {
          const chain = row.original._chain || [];
          const parent = chain.length ? chain[chain.length - 1] : null;
          return <span className="text-muted-foreground">{parent || "—"}</span>;
        },
      },
      {
        id: "level",
        accessorFn: (row) => levelName[row.level_id] || "",
        header: ({ column }) => <SortableHeader column={column}>Level</SortableHeader>,
        cell: ({ row }) => {
          const name = levelName[row.original.level_id];
          return <span className="text-muted-foreground">{name || "—"}</span>;
        },
      },
      {
        id: "order",
        accessorFn: (row) => row.order ?? 0,
        header: ({ column }) => <SortableHeader column={column}>Order</SortableHeader>,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.order ?? 0}</span>
        ),
      },
      ...(isAdmin ? [{
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
                onClick={() => moveRole(row.original, -1)}
                data-testid={`roles-move-left-${row.original.id}`}
              >
                <ArrowLeft className="size-4" /> Move left
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => moveRole(row.original, 1)}
                data-testid={`roles-move-right-${row.original.id}`}
              >
                <ArrowRight className="size-4" /> Move right
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openEdit(row.original)}
                data-testid={`roles-edit-${row.original.id}`}
              >
                <Pencil className="size-4" /> Edit
              </DropdownMenuItem>
              {!isProtectedRole(row.original.name) && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteTarget(row.original)}
                  data-testid={`roles-delete-${row.original.id}`}
                >
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
      }] : []),
    ],
    [levelName, roles, isAdmin], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const table = useReactTable({
    data: treeData,
    columns,
    state: { globalFilter, rowSelection, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getRowId: (row) => row.id,
    globalFilterFn: (row, _col, value) =>
      row.original.name.toLowerCase().includes(value.toLowerCase()),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Role List</CardTitle>
          {isAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" data-testid="roles-actions-btn">
                  <Settings2 className="size-4" /> Actions
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openCreate} data-testid="roles-add">
                  <Plus className="size-4" /> Add role
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportOpen(true)} data-testid="roles-import">
                  <Upload className="size-4" /> Import
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportRoles("xlsx")}
                  disabled={exportingData}
                  data-testid="roles-export-xlsx"
                >
                  <Download className="size-4" /> Export (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportRoles("csv")}
                  disabled={exportingData}
                  data-testid="roles-export-csv"
                >
                  <Download className="size-4" /> Export (CSV)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLevelsOpen(true)} data-testid="roles-levels-btn">
                  <Layers className="size-4" /> Levels
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStructureOpen(true)} data-testid="roles-structure-btn">
                  <Network className="size-4" /> Structure
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStructureOpen(true)}
              data-testid="roles-structure-btn"
            >
              <Network className="size-4" /> Structure
            </Button>
          )}
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
              {isAdmin && selectedCount > 0 && (
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
              {globalFilter.trim().length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGlobalFilter("")}
                  data-testid="roles-reset"
                >
                  <FilterX className="size-4" /> Reset
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
                    isAdmin ? (
                      <Button onClick={openCreate} data-testid="roles-empty-add">
                        <Plus className="size-4" /> Add Role
                      </Button>
                    ) : undefined
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
                      <TableCell colSpan={colSpan} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <span>No roles match your search.</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setGlobalFilter("")}
                            data-testid="roles-empty-reset"
                          >
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
                <span>of {totalRows.toLocaleString()} rows</span>
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

      <LevelManagerDialog
        open={levelsOpen}
        onOpenChange={setLevelsOpen}
        levels={levels}
        onChanged={loadLevels}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Roles"
        resource="roles"
        templateFilename="roles_import_template.xlsx"
        instructions="Upload an .xlsx file with columns: name, parent, dotted_parent, level, order (parent/dotted/level by name). Existing roles (matched by name) are updated. All rows are validated first — if any row fails, nothing is imported."
        onImported={load}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && closeDelete()}
      >
        <AlertDialogContent data-testid="roles-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reassignInfo ? "Reassign users before deleting" : "Delete role?"}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 px-6 py-4">
            {reassignInfo ? (
              <>
                <AlertDialogDescription>
                  {reassignInfo.message} Choose a role to move them to, then delete.
                </AlertDialogDescription>
                <Select value={reassignTarget} onValueChange={setReassignTarget}>
                  <SelectTrigger data-testid="roles-reassign-target">
                    <SelectValue placeholder="Select target role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles
                      .filter((r) => r.id !== deleteTarget?.id)
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <AlertDialogDescription>
                This will delete{" "}
                <span className="font-medium text-foreground">
                  {deleteTarget?.name}
                </span>
                . Any direct subordinates will be moved up to its superior.
              </AlertDialogDescription>
            )}
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={closeDelete} data-testid="roles-delete-cancel">
              Cancel
            </Button>
            {reassignInfo ? (
              <Button
                onClick={confirmReassignDelete}
                disabled={!reassignTarget}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="roles-reassign-confirm"
              >
                Reassign &amp; delete
              </Button>
            ) : (
              <Button
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="roles-delete-confirm"
              >
                Delete
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent data-testid="roles-bulk-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} role(s)?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4">
            <AlertDialogDescription>
              Subordinates of deleted roles will be moved up to the nearest
              surviving superior.
            </AlertDialogDescription>
          </div>
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
          className="grid max-h-[90vh] w-[95vw] max-w-[95vw] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden"
          data-testid="roles-structure-dialog"
        >
          <DialogHeader>
            <DialogTitle>Role structure</DialogTitle>
            <DialogDescription>
              Org chart per level (swimlane). Solid = direct superior, dashed =
              dotted-line superior.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex min-h-0 flex-col overflow-hidden">
            <OrgChart ref={orgRef} roles={roles} levels={levels} />
          </DialogBody>
          <DialogFooter>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={exportingChart}
                  data-testid="org-export-btn"
                >
                  <Download className="size-4" />
                  {exportingChart ? "Exporting..." : "Export"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleExport("png")}
                  data-testid="org-export-png"
                >
                  <FileImage className="size-4" /> Download PNG
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("pdf")}
                  data-testid="org-export-pdf"
                >
                  <FileText className="size-4" /> Download PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
