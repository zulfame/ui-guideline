import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import API from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Combobox } from "@/components/composite/Combobox";
import { EmptyState } from "@/components/composite/EmptyState";

const NONE = "__none__";

const roleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  parent_id: z.string().optional(),
  dotted_parent_id: z.string().optional(),
  level_id: z.string().optional(),
  order: z.coerce.number().int("Whole number").min(0, "Must be ≥ 0"),
});

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

export default function RoleFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [status, setStatus] = useState("loading");
  const [roles, setRoles] = useState([]);
  const [levels, setLevels] = useState([]);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", parent_id: NONE, dotted_parent_id: NONE, level_id: NONE, order: 0 },
  });

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [rRes, lRes] = await Promise.all([
        API.get("/roles", { params: { limit: 500 } }),
        API.get("/levels", { params: { limit: 500 } }),
      ]);
      setRoles(rRes.data);
      setLevels(lRes.data);
      if (isEdit) {
        const current = rRes.data.find((r) => r.id === id);
        if (!current) {
          setStatus("error");
          return;
        }
        setEditing(current);
        form.reset({
          name: current.name || "",
          parent_id: current.parent_id || NONE,
          dotted_parent_id: current.dotted_parent_id || NONE,
          level_id: current.level_id || NONE,
          order: current.order ?? 0,
        });
      }
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [id, isEdit, form]);

  useEffect(() => {
    load();
  }, [load]);

  const parentComboOptions = useMemo(() => {
    const blocked = editing ? descendantIds(roles, editing.id) : new Set();
    const options = roles.filter((r) => r.id !== editing?.id && !blocked.has(r.id));
    return [{ value: NONE, label: "None (top level)" }, ...options.map((r) => ({ value: r.id, label: r.name }))];
  }, [roles, editing]);

  const dottedComboOptions = useMemo(
    () => [
      { value: NONE, label: "None" },
      ...roles.filter((r) => r.id !== editing?.id).map((r) => ({ value: r.id, label: r.name })),
    ],
    [roles, editing],
  );

  const levelComboOptions = useMemo(
    () => [{ value: NONE, label: "None" }, ...levels.map((l) => ({ value: l.id, label: l.name }))],
    [levels],
  );

  const submit = async (data) => {
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
      if (isEdit) {
        await API.put(`/roles/${id}`, payload);
        toast.success("Role updated", { description: payload.name });
      } else {
        await API.post("/roles", payload);
        toast.success("Role created", { description: payload.name });
      }
      navigate("/roles");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 409 && typeof detail === "string") {
        form.setError("name", { message: detail });
      } else {
        toast.error("Failed to save role", {
          description: typeof detail === "string" ? detail : "Please try again.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="role-form-page">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => navigate("/roles")}
          aria-label="Back to roles"
          data-testid="role-form-back"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-base font-semibold tracking-tight">
            {isEdit ? "Edit Role" : "Add Role"}
          </h1>
          <p className="text-sm text-muted-foreground">
            A role represents a position (jabatan). Configure its superior, level and order.
          </p>
        </div>
      </div>

      {status === "error" ? (
        <EmptyState
          variant="error"
          action={
            <Button variant="outline" size="sm" onClick={load} data-testid="role-form-retry">
              Try again
            </Button>
          }
        />
      ) : status === "loading" ? (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4" data-testid="role-form-loading">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} noValidate>
            <Card>
              <CardContent className="space-y-5 pt-6">
                <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="role-field-name" />
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
                        <FormLabel>Direct superior</FormLabel>
                        <Combobox
                          options={parentComboOptions}
                          value={field.value || NONE}
                          onChange={(v) => field.onChange(v || NONE)}
                          placeholder="(Optional)"
                          searchPlaceholder="Search role..."
                          emptyText="No role found."
                          data-testid="role-field-parent"
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
                          data-testid="role-field-dotted"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                          data-testid="role-field-level"
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
                          <Input type="number" min={0} {...field} data-testid="role-field-order" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-2 border-t">
                <Button type="button" variant="outline" onClick={() => navigate("/roles")} data-testid="role-form-cancel">
                  <ArrowLeft className="size-4" aria-hidden="true" /> Back
                </Button>
                <Button type="submit" disabled={submitting} data-testid="role-form-submit">
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="size-4" aria-hidden="true" />
                  )}
                  {submitting ? "Saving..." : isEdit ? "Save changes" : "Save role"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}
    </div>
  );
}
