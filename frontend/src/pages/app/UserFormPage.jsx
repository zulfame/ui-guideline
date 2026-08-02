import { useCallback, useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EmptyState } from "@/components/composite/EmptyState";

const UNIQUE_FIELDS = ["user_id", "email", "username", "phone", "alias", "mso_code", "collector_code"];
const OPTIONAL_TEXT = [
  "username", "phone", "alias", "mso_code", "collector_code",
  "device_identifier", "device_name", "device_os", "fcm_token",
];

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  role_id: z.string().min(1, "Role is required"),
  office_id: z.string().min(1, "Office is required"),
  user_id: z.string().optional().refine((v) => !v || /^\d+$/.test(v.trim()), "Must be a positive number"),
  is_active: z.boolean(),
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
  name: "", email: "", role_id: "", office_id: "", user_id: "", is_active: true,
  username: "", phone: "", alias: "", mso_code: "", collector_code: "",
  device_identifier: "", device_name: "", device_os: "", fcm_token: "",
};

function toUserForm(u) {
  if (!u) return emptyUser;
  return {
    name: u.name ?? "", email: u.email ?? "",
    role_id: u.role_id ?? "", office_id: u.office_id ?? "",
    user_id: u.user_id != null ? String(u.user_id) : "",
    is_active: u.is_active !== false,
    username: u.username ?? "", phone: u.phone ?? "", alias: u.alias ?? "",
    mso_code: u.mso_code ?? "", collector_code: u.collector_code ?? "",
    device_identifier: u.device_identifier ?? "", device_name: u.device_name ?? "",
    device_os: u.device_os ?? "", fcm_token: u.fcm_token ?? "",
  };
}

function buildUserPayload(data, isEdit) {
  const payload = {
    name: data.name.trim(),
    email: data.email.trim(),
    role_id: data.role_id,
    office_id: data.office_id,
    is_active: data.is_active,
  };
  OPTIONAL_TEXT.forEach((k) => {
    const v = data[k] ? data[k].trim() : "";
    if (v) payload[k] = v;
    else if (isEdit) payload[k] = null;
  });
  const uid = data.user_id != null ? String(data.user_id).trim() : "";
  if (uid !== "" && /^\d+$/.test(uid)) payload.user_id = parseInt(uid, 10);
  return payload;
}

function fieldFromDetail(detail) {
  if (typeof detail !== "string") return null;
  return UNIQUE_FIELDS.find((f) => detail.toLowerCase().includes(f)) || null;
}

const TEXT_FIELDS = [
  { name: "name", label: "Name" },
  { name: "email", label: "Email", type: "email" },
];
const OPTIONAL_FIELDS = [
  { name: "username", label: "Username" },
  { name: "phone", label: "Phone" },
  { name: "alias", label: "Alias" },
  { name: "mso_code", label: "MSO Code" },
  { name: "collector_code", label: "Collector Code" },
  { name: "device_identifier", label: "Device Identifier" },
  { name: "device_name", label: "Device Name" },
  { name: "device_os", label: "Device OS" },
  { name: "fcm_token", label: "FCM Token" },
];

export default function UserFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [status, setStatus] = useState("loading");
  const [roles, setRoles] = useState([]);
  const [offices, setOffices] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({ resolver: zodResolver(userSchema), defaultValues: emptyUser });

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const reqs = [
        API.get("/roles", { params: { limit: 500 } }),
        API.get("/offices", { params: { limit: 500 } }),
      ];
      if (isEdit) reqs.push(API.get(`/users/${id}`));
      const [rRes, oRes, uRes] = await Promise.all(reqs);
      setRoles(rRes.data);
      setOffices(oRes.data);
      if (isEdit) form.reset(toUserForm(uRes.data));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [id, isEdit, form]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (data) => {
    setSubmitting(true);
    const payload = buildUserPayload(data, isEdit);
    try {
      if (isEdit) {
        await API.put(`/users/${id}`, payload);
        toast.success("User updated", { description: payload.name });
      } else {
        await API.post("/users", payload);
        toast.success("User created", {
          description: `${payload.name} — default password set (must change on first login).`,
        });
      }
      navigate("/users");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const httpStatus = err?.response?.status;
      const field = fieldFromDetail(detail);
      if (httpStatus === 409 && field) {
        form.setError(field, { message: detail });
      } else if (httpStatus === 400 && typeof detail === "string") {
        form.setError(detail.toLowerCase().includes("office") ? "office_id" : "role_id", { message: detail });
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
    <div className="space-y-6" data-testid="user-form-page">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => navigate("/users")}
          aria-label="Back to users"
          data-testid="user-form-back"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-base font-semibold tracking-tight">
            {isEdit ? "Edit User" : "Add User"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Update the user details below."
              : "A system default password is assigned and must be changed on first login."}
          </p>
        </div>
      </div>

      {status === "error" ? (
        <EmptyState
          variant="error"
          action={
            <Button variant="outline" size="sm" onClick={load} data-testid="user-form-retry">
              Try again
            </Button>
          }
        />
      ) : status === "loading" ? (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4" data-testid="user-form-loading">
            {Array.from({ length: 12 }).map((_, i) => (
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
                    name="user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User ID</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder={isEdit ? "" : "Auto"}
                            {...field}
                            data-testid="user-field-user_id"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          {isEdit ? "Unique. You can change it." : "Auto-generated if left blank. Unique; can be edited."}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {TEXT_FIELDS.map((f) => (
                    <FormField
                      key={f.name}
                      control={form.control}
                      name={f.name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{f.label}</FormLabel>
                          <FormControl>
                            <Input type={f.type || "text"} {...field} data-testid={`user-field-${f.name}`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}

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
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
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
                              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {OPTIONAL_FIELDS.map((f) => (
                    <FormField
                      key={f.name}
                      control={form.control}
                      name={f.name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{f.label}</FormLabel>
                          <FormControl>
                            <Input placeholder="(Optional)" {...field} data-testid={`user-field-${f.name}`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <div className="flex h-10 items-center gap-2 rounded-md border px-3">
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="user-field-active"
                            aria-label="Active status"
                          />
                          <span className="text-sm text-muted-foreground">
                            {field.value ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
              <CardFooter className="justify-start gap-2 border-t">
                <Button type="submit" disabled={submitting} data-testid="user-form-submit">
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="size-4" aria-hidden="true" />
                  )}
                  {submitting ? "Saving..." : isEdit ? "Save changes" : "Save user"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/users")}
                  data-testid="user-form-cancel"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" /> Back
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}
    </div>
  );
}
