import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, KeyRound, Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/composite/PasswordInput";
import {
  DataTableCard,
  SortableHeader,
  fmtDate,
} from "@/components/composite/DataTableCard";
import { toast } from "@/components/ui/sonner";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const schema = z
  .object({
    newPassword: z
      .string()
      .min(6, { message: "Password must be at least 6 characters." })
      .max(128, { message: "Password is too long." }),
    confirmPassword: z.string().min(1, { message: "Please confirm your password." }),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

function formatApiErrorDetail(detail) {
  if (detail == null) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

/**
 * SettingsPage
 * Self-service settings: change your own password and review your own
 * password-reset requests (sourced from the durable audit log).
 */
export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [resets, setResets] = useState([]);
  const [resetsLoading, setResetsLoading] = useState(true);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onSubmit",
  });

  const loadResets = useCallback(async () => {
    setResetsLoading(true);
    try {
      const { data } = await API.get("/account/password-resets", { params: { limit: 50 } });
      setResets(data);
    } catch {
      toast.error("Failed to load password reset history");
    } finally {
      setResetsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResets();
  }, [loadResets]);

  const onSubmit = async (values) => {
    setFormError("");
    setIsSubmitting(true);
    try {
      await API.post(`/users/${user.id}/change-password`, {
        new_password: values.newPassword,
      });
      await refresh();
      form.reset({ newPassword: "", confirmPassword: "" });
      toast.success("Password updated", {
        description: "Your password has been changed successfully.",
      });
    } catch (e) {
      setFormError(
        formatApiErrorDetail(e?.response?.data?.detail) ||
          "Unable to update password. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
    ],
    [],
  );

  return (
    <div className="space-y-6" data-testid="settings-page">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">Change password</CardTitle>
          </div>
          <CardDescription>
            Set a new password. It must differ from your last few passwords.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <CardContent className="space-y-5">
              {formError ? (
                <Alert variant="destructive" data-testid="settings-pw-error-alert">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>Could not update password</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="max-w-md space-y-5">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          autoComplete="new-password"
                          placeholder="Enter a new password"
                          data-testid="settings-pw-new-input"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          autoComplete="new-password"
                          placeholder="Re-enter the new password"
                          data-testid="settings-pw-confirm-input"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end border-t pt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="settings-pw-submit-button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Updating...
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <DataTableCard
        title="Password Reset Requests"
        description="Your recent self-service reset requests, whether the email was sent, and if the reset was completed."
        onRefresh={loadResets}
        refreshTestId="settings-resets-refresh"
        columns={resetColumns}
        data={resets}
        loading={resetsLoading}
        searchPlaceholder="Search email..."
        testid="settings-resets"
        emptyIcon={KeyRound}
        emptyTitle="No reset requests"
        emptyDescription="You have not requested a password reset recently."
      />
    </div>
  );
}
