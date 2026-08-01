import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Loader2, KeyRound, LogOut } from "lucide-react";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/composite/PasswordInput";
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
 * ChangePasswordPage
 * Forced password change: shown when the authenticated user has
 * `must_change_password` (first login or 90-day expiry). Updates the user's
 * own password, refreshes the session, then routes to the dashboard.
 */
export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, refresh, logout } = useAuth();
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
      toast.success("Password updated", {
        description: "Your password has been changed successfully.",
      });
      navigate("/");
    } catch (e) {
      setFormError(
        formatApiErrorDetail(e?.response?.data?.detail) ||
          "Unable to update password. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <AuthLayout>
      <Card className="border-border/60">
        <CardHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-2xl">Change your password</CardTitle>
          </div>
          <CardDescription>
            {user?.password_expired
              ? "Your password has expired. Please set a new one to continue."
              : "For your security, please set a new password before continuing."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
              noValidate
            >
              {formError ? (
                <Alert variant="destructive" data-testid="change-password-error-alert">
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
                        data-testid="change-password-new-input"
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
                        data-testid="change-password-confirm-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="change-password-submit-button"
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

              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handleLogout}
                data-testid="change-password-logout-button"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out instead
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
