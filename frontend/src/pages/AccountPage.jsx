import { useState } from "react";
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

const PW_STATUS = {
  active: { label: "Active", variant: "secondary" },
  expiring: { label: "Expiring soon", variant: "outline" },
  expired: { label: "Expired", variant: "destructive" },
};

function Field({ label, value, testId }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium" data-testid={testId}>
        {value || <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
}

/**
 * AccountPage
 * Any authenticated user can view their profile and change their own password
 * at any time (self-service; complements the forced-change flow).
 */
export default function AccountPage() {
  const { user, refresh } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onSubmit",
  });

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

  const pwMeta = PW_STATUS[user?.password_status] || PW_STATUS.active;
  const expires = user?.password_expires_at
    ? new Date(user.password_expires_at).toLocaleDateString()
    : "—";

  return (
    <div className="space-y-6" data-testid="account-page">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name" value={user?.name} testId="account-name" />
            <Field label="Email" value={user?.email} testId="account-email" />
            <Field label="Username" value={user?.username} testId="account-username" />
            <Field label="Phone" value={user?.phone} testId="account-phone" />
            <Field label="Role" value={user?.is_admin ? "Administrator" : user?.role_name} testId="account-role" />
            <Field label="Office" value={user?.office_name} testId="account-office" />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Password status</p>
              <div className="flex items-center gap-2">
                <Badge variant={pwMeta.variant} className="font-normal" data-testid="account-pw-status">
                  {pwMeta.label}
                </Badge>
                <span className="text-xs text-muted-foreground">expires {expires}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="max-w-md space-y-5"
              noValidate
            >
              {formError ? (
                <Alert variant="destructive" data-testid="account-pw-error-alert">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>Could not update password</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}

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
                        data-testid="account-pw-new-input"
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
                        data-testid="account-pw-confirm-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="account-pw-submit-button"
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
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
