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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EmptyState } from "@/components/composite/EmptyState";

const emptyToUndef = (v) => (v === "" || v === null ? undefined : v);

const officeSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  telephone: z.string().optional(),
  latitude: z.preprocess(emptyToUndef, z.coerce.number().min(-90, "Min -90").max(90, "Max 90").optional()),
  longitude: z.preprocess(emptyToUndef, z.coerce.number().min(-180, "Min -180").max(180, "Max 180").optional()),
  radius: z.preprocess(emptyToUndef, z.coerce.number().min(0, "Must be ≥ 0").optional()),
  note: z.string().optional(),
});

const emptyValues = {
  code: "", name: "", address: "", telephone: "",
  latitude: "", longitude: "", radius: "", note: "",
};

function toFormValues(office) {
  if (!office) return emptyValues;
  return {
    code: office.code ?? "", name: office.name ?? "",
    address: office.address ?? "", telephone: office.telephone ?? "",
    latitude: office.latitude ?? "", longitude: office.longitude ?? "",
    radius: office.radius ?? "", note: office.note ?? "",
  };
}

function buildPayload(data, isEdit) {
  const payload = { code: data.code.trim(), name: data.name.trim() };
  ["address", "telephone", "note"].forEach((k) => {
    const v = data[k] ? data[k].trim() : "";
    if (v) payload[k] = v;
    else if (isEdit) payload[k] = null;
  });
  ["latitude", "longitude"].forEach((k) => {
    const raw = data[k];
    if (raw !== undefined && raw !== "" && !Number.isNaN(Number(raw))) payload[k] = Number(raw);
    else if (isEdit) payload[k] = null;
  });
  if (data.radius !== undefined && data.radius !== "" && !Number.isNaN(Number(data.radius))) {
    payload.radius = Number(data.radius);
  } else if (isEdit) {
    payload.radius = 100;
  }
  return payload;
}

const TEXT_FIELDS = [
  { name: "code", label: "Code" },
  { name: "name", label: "Name" },
  { name: "telephone", label: "Telephone", optional: true },
  { name: "radius", label: "Radius (m)", type: "number", optional: true },
  { name: "latitude", label: "Latitude", type: "number", step: "any", optional: true },
  { name: "longitude", label: "Longitude", type: "number", step: "any", optional: true },
  { name: "address", label: "Address", optional: true },
  { name: "note", label: "Note", optional: true },
];

export default function OfficeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [status, setStatus] = useState(isEdit ? "loading" : "ready");
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({ resolver: zodResolver(officeSchema), defaultValues: emptyValues });

  const load = useCallback(async () => {
    if (!isEdit) {
      setStatus("ready");
      return;
    }
    setStatus("loading");
    try {
      const { data } = await API.get(`/offices/${id}`);
      form.reset(toFormValues(data));
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
    const payload = buildPayload(data, isEdit);
    try {
      if (isEdit) {
        await API.put(`/offices/${id}`, payload);
        toast.success("Office updated", { description: payload.name });
      } else {
        await API.post("/offices", payload);
        toast.success("Office created", { description: payload.name });
      }
      navigate("/offices");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 409 && typeof detail === "string") {
        form.setError(detail.includes("code") ? "code" : "name", { message: detail });
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
    <div className="space-y-6" data-testid="office-form-page">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => navigate("/offices")}
          aria-label="Back to offices"
          data-testid="office-form-back"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-base font-semibold tracking-tight">
            {isEdit ? "Edit Office" : "Add Office"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Update the office details below." : "Create a new office. Code and name are required."}
          </p>
        </div>
      </div>

      {status === "error" ? (
        <EmptyState
          variant="error"
          action={
            <Button variant="outline" size="sm" onClick={load} data-testid="office-form-retry">
              Try again
            </Button>
          }
        />
      ) : status === "loading" ? (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4" data-testid="office-form-loading">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} noValidate>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Office details</CardTitle>
                <CardDescription>Code, name, contact and geofence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {TEXT_FIELDS.map((f) => (
                    <FormField
                      key={f.name}
                      control={form.control}
                      name={f.name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{f.label}</FormLabel>
                          <FormControl>
                            <Input
                              type={f.type || "text"}
                              step={f.step}
                              placeholder={f.optional ? "(Optional)" : undefined}
                              {...field}
                              data-testid={`office-field-${f.name}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-2 border-t">
                <Button type="button" variant="outline" onClick={() => navigate("/offices")} data-testid="office-form-cancel">
                  <ArrowLeft className="size-4" aria-hidden="true" /> Back
                </Button>
                <Button type="submit" disabled={submitting} data-testid="office-form-submit">
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="size-4" aria-hidden="true" />
                  )}
                  {submitting ? "Saving..." : isEdit ? "Save changes" : "Save office"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}
    </div>
  );
}
