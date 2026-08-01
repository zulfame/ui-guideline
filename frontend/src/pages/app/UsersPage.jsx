import { useCallback, useEffect, useMemo, useState } from "react";
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
  FilterX,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import API from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const PW_BADGE = {
  active: { variant: "secondary", label: "Active" },
  expiring: { variant: "outline", label: "Expiring soon" },
  expired: { variant: "destructive", label: "Expired" },
};

const UNIQUE_FIELDS = ["email", "username", "phone", "alias", "mso_code", "collector_code"];

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  role_id: z.string().min(1, "Role is required"),
  office_id: z.string().min(1, "Office is required"),
  username: z.string().optional(),
  phone: z.string().optional(),
  alias: z.string().optional(),
  mso_code: z.string().optional(),
  collector_code: z.string().optional(),
  device_identifier: z.string().optional(),
  device_name: z.string().optional(),
  device_os: z.string().optional(),
  fcm_token: z.string().optional(),
});

const emptyUser = {
  name: "",
  email: "",
  role_id: "",
  office_id: "",
  username: "",
  phone: "",
  alias: "",
  mso_code: "",
  collector_code: "",
  device_identifier: "",
  device_name: "",
  device_os: "",
  fcm_token: "",
};

function toUserForm(u) {
  if (!u) return emptyUser;
  return {
    name: u.name ?? "",
    email: u.email ?? "",
    role_id: u.role_id ?? "",
    office_id: u.office_id ?? "",
    username: u.username ?? "",
    phone: u.phone ?? "",
    alias: u.alias ?? "",
    mso_code: u.mso_code ?? "",
    collector_code: u.collector_code ?? "",
    device_identifier: u.device_identifier ?? "",
    device_name: u.device_name ?? "",
    device_os: u.device_os ?? "",
    fcm_token: u.fcm_token ?? "",
  };
}

function buildUserPayload(data, isEdit) {
  const payload = {
    name: data.name.trim(),
    email: data.email.trim(),
    role_id: data.role_id,
    office_id: data.office_id,
  };
  ["username", "phone", "alias", "mso_code", "collector_code", "device_identifier", "device_name", "device_os", "fcm_token"].forEach((k) => {
    const v = data[k] ? data[k].trim() : "";
    if (v) payload[k] = v;
    else if (isEdit) payload[k] = null;
  });
  return payload;
}

function fieldFromDetail(detail) {
  if (typeof detail !== "string") return null;
  return UNIQUE_FIELDS.find((f) => detail.toLowerCase().includes(f)) || null;
}

function UserFormDialog({ open, onOpenChange, mode, initialValues, roles, offices, onSaved }) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm({ resolver: zodResolver(userSchema), defaultValues: emptyUser });

  useEffect(() => {
    if (open) form.reset(toUserForm(initialValues));
  }, [open, initialValues, form]);

  const submit = async (data) => {
    setSubmitting(true);
    const payload = buildUserPayload(data, mode === "edit");
    try {
      if (mode === "edit") {
        await API.put(`/users/${initialValues.id}`, payload);
        toast.success("User updated", { description: payload.name });
      } else {
        await API.post("/users", payload);
        toast.success("User created", {
          description: `${payload.name} — default password set (must change on first login).`,
        });
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const status = err?.response?.status;
      const field = fieldFromDetail(detail);
      if (status === 409 && field) {
        form.setError(field, { message: detail });
      } else if (status === 400 && typeof detail === "string") {
        // role/office invalid
        const f = detail.toLowerCase().includes("office") ? "office_id" : "role_id";
        form.setError(f, { message: detail });
      } else {
        toast.error("Failed to save user", {
          description: typeof detail === "string" ? detail : "Please try again.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl" data-testid="user-form-dialog">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} noValidate>
            <DialogHeader>
              <DialogTitle>{mode === "edit" ? "Edit User" : "Add User"}</DialogTitle>
              <DialogDescription>
                {mode === "edit"
                  ? "Update the user details below."
                  : "Create a new user. A system default password is assigned and must be changed on first login."}
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="user-field-name" />
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
                        <Input type="email" {...field} data-testid="user-field-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="user-field-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((r) => (
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
                <FormField
                  control={form.control}
                  name="office_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="user-field-office">
                            <SelectValue placeholder="Select office" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {offices.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.name}
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
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="(Optional)" {...field} data-testid="user-field-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(Optional)" {...field} data-testid="user-field-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3 sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="alias"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alias</FormLabel>
                        <FormControl>
                          <Input placeholder="(Optional)" {...field} data-testid="user-field-alias" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mso_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>MSO Code</FormLabel>
                        <FormControl>
                          <Input placeholder="(Optional)" {...field} data-testid="user-field-mso" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="collector_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collector Code</FormLabel>
                        <FormControl>
                          <Input placeholder="(Optional)" {...field} data-testid="user-field-collector" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Device &amp; Integration
                </h4>
                <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="device_identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Identifier</FormLabel>
                        <FormControl>
                          <Input placeholder="(Optional)" {...field} data-testid="user-field-device-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="device_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Name</FormLabel>
                        <FormControl>
                          <Input placeholder="(Optional)" {...field} data-testid="user-field-device-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="device_os"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device OS</FormLabel>
                        <FormControl>
                          <Input placeholder="(Optional)" {...field} data-testid="user-field-device-os" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fcm_token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>FCM Token</FormLabel>
                        <FormControl>
                          <Input placeholder="(Optional)" {...field} data-testid="user-field-fcm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </DialogBody>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" data-testid="user-form-cancel">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting} data-testid="user-form-submit">
                {submitting ? "Saving..." : mode === "edit" ? "Save changes" : "Save user"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const changePwSchema = z
  .object({
    new_password: z.string().min(6, "Min 6 characters"),
    confirm: z.string().min(1, "Please confirm"),
  })
  .refine((d) => d.new_password === d.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

function ChangePasswordDialog({ open, onOpenChange, user, onSaved }) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm({
    resolver: zodResolver(changePwSchema),
    defaultValues: { new_password: "", confirm: "" },
  });

  useEffect(() => {
    if (open) form.reset({ new_password: "", confirm: "" });
  }, [open, form]);

  const submit = async (data) => {
    setSubmitting(true);
    try {
      await API.post(`/users/${user.id}/change-password`, {
        new_password: data.new_password,
      });
      toast.success("Password changed", { description: user.name });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 400 && typeof detail === "string") {
        form.setError("new_password", { message: detail });
      } else {
        toast.error("Failed to change password", {
          description: typeof detail === "string" ? detail : "Please try again.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="user-changepw-dialog">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} noValidate>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Set a new password for {user?.name}. It must differ from the last 3 passwords.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="new_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} data-testid="user-changepw-new" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} data-testid="user-changepw-confirm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" data-testid="user-changepw-cancel">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting} data-testid="user-changepw-submit">
                {submitting ? "Saving..." : "Change password"}
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

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [offices, setOffices] = useState([]);
  const [status, setStatus] = useState("loading");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editing, setEditing] = useState(null);
  const [pwTarget, setPwTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setStatus("loading");
    try {
      const [uRes, rRes, oRes] = await Promise.all([
        API.get("/users", { params: { limit: 500 } }),
        API.get("/roles", { params: { limit: 500 } }),
        API.get("/offices", { params: { limit: 500 } }),
      ]);
      setUsers(uRes.data);
      setRoles(rRes.data);
      setOffices(oRes.data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreate = () => {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (user) => {
    setFormMode("edit");
    setEditing(user);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await API.delete(`/users/${deleteTarget.id}`);
      toast.success("User deleted", { description: deleteTarget.name });
      setDeleteTarget(null);
      fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const confirmReset = async () => {
    try {
      await API.post(`/users/${resetTarget.id}/reset-password`, {});
      toast.success("Password reset to default", {
        description: `${resetTarget.name} must change it on next login.`,
      });
      setResetTarget(null);
      fetchUsers();
    } catch {
      toast.error("Failed to reset password");
    }
  };

  const confirmBulkDelete = async () => {
    const ids = table.getFilteredSelectedRowModel().rows.map((r) => r.original.id);
    try {
      await API.post("/users/bulk-delete", { ids });
      toast.success(`${ids.length} user(s) deleted`);
      setBulkOpen(false);
      setRowSelection({});
      fetchUsers();
    } catch {
      toast.error("Failed to delete users");
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
            data-testid="users-select-all"
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
        accessorKey: "name",
        header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "email",
        header: ({ column }) => <SortableHeader column={column}>Email</SortableHeader>,
      },
      {
        accessorKey: "username",
        header: ({ column }) => <SortableHeader column={column}>Username</SortableHeader>,
        cell: ({ row }) => row.original.username || "—",
      },
      {
        accessorKey: "role_name",
        header: ({ column }) => <SortableHeader column={column}>Role</SortableHeader>,
        cell: ({ row }) => row.original.role_name || "—",
      },
      {
        accessorKey: "office_name",
        header: ({ column }) => <SortableHeader column={column}>Office</SortableHeader>,
        cell: ({ row }) => row.original.office_name || "—",
      },
      {
        accessorKey: "password_status",
        header: ({ column }) => <SortableHeader column={column}>Password</SortableHeader>,
        cell: ({ row }) => {
          const meta = PW_BADGE[row.original.password_status] || PW_BADGE.active;
          return (
            <Badge variant={meta.variant} className="font-normal">
              {meta.label}
            </Badge>
          );
        },
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
                  className="size-8"
                  aria-label="Row actions"
                  data-testid={`users-row-actions-${row.original.id}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => openEdit(row.original)}
                  data-testid={`users-edit-${row.original.id}`}
                >
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setPwTarget(row.original)}
                  data-testid={`users-changepw-${row.original.id}`}
                >
                  <KeyRound className="size-4" /> Change password
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setResetTarget(row.original)}
                  data-testid={`users-reset-${row.original.id}`}
                >
                  <RotateCcw className="size-4" /> Reset to default
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteTarget(row.original)}
                  data-testid={`users-delete-${row.original.id}`}
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
    data: users,
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
    <div className="space-y-6" data-testid="users-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">User List</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportOpen(true)}
                  data-testid="users-import"
                >
                  <Upload className="size-4" /> Import
                </Button>
                <Button size="sm" onClick={openCreate} data-testid="users-add">
                  <Plus className="size-4" /> Add User
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search users..."
                className="pl-8"
                data-testid="users-search"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkOpen(true)}
                  className="border-destructive/50 text-destructive hover:text-destructive"
                  data-testid="users-bulk-delete"
                >
                  <Trash2 className="size-4" /> Delete ({selectedCount})
                </Button>
              )}
              {hasSearch && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGlobalFilter("")}
                  data-testid="users-reset-search"
                >
                  <FilterX className="size-4" /> Reset
                </Button>
              )}
              <DensityToggle />
            </div>
          </div>

          <div className="rounded-md border">
            {status === "error" ? (
              <EmptyState
                variant="error"
                action={
                  <Button variant="outline" size="sm" onClick={fetchUsers} data-testid="users-retry">
                    <RefreshCw className="size-4" /> Try again
                  </Button>
                }
              />
            ) : status === "loading" ? (
              <div className="space-y-2 p-4" data-testid="users-loading">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <EmptyState
                variant="first-time"
                title="No users yet"
                description="Create your first user to get started."
                action={
                  isAdmin ? (
                    <Button size="sm" onClick={openCreate} data-testid="users-empty-add">
                      <Plus className="size-4" /> Add User
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Table data-testid="users-table" className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
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
                      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                        <div className="flex flex-col items-center gap-2" data-testid="users-empty-filtered">
                          <span>No users match your search.</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setGlobalFilter("")}
                            data-testid="users-clear-search"
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

          {status === "ready" && users.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[70px]" data-testid="users-page-size">
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

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialValues={editing}
        roles={roles}
        offices={offices}
        onSaved={fetchUsers}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Users"
        resource="users"
        templateFilename="users_import_template.xlsx"
        instructions="Upload an .xlsx file. Required columns: name, email, role, office (role & office by name). New users get the system default password and must change it on first login. Existing users (matched by email) are updated. All rows are validated first — if any row fails, nothing is imported."
        onImported={fetchUsers}
      />

      <ChangePasswordDialog
        open={!!pwTarget}
        onOpenChange={(v) => !v && setPwTarget(null)}
        user={pwTarget}
        onSaved={fetchUsers}
      />

      <AlertDialog open={!!resetTarget} onOpenChange={(v) => !v && setResetTarget(null)}>
        <AlertDialogContent data-testid="users-reset-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password to default?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4">
            <AlertDialogDescription>
              This resets{" "}
              <span className="font-medium text-foreground">{resetTarget?.name}</span>&apos;s
              password to the system default. They must change it on next login.
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="users-reset-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset} data-testid="users-reset-confirm">
              Reset password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="users-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4">
            <AlertDialogDescription>
              This will remove{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span>. This
              action cannot be undone.
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="users-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="users-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent data-testid="users-bulk-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} user(s)?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4">
            <AlertDialogDescription>
              This will remove the selected users. This action cannot be undone.
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="users-bulk-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="users-bulk-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
