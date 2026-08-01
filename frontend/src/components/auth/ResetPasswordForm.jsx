import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/composite/PasswordInput";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  resetPasswordSchema,
  resetPasswordDefaultValues,
} from "@/lib/validation/authSchema";
import API from "@/lib/api";

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
 * ResetPasswordForm
 * Consumes a single-use token from the URL and sets a new password.
 */
export const ResetPasswordForm = ({ token }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState("");

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: resetPasswordDefaultValues,
    mode: "onSubmit",
  });

  const onSubmit = async (values) => {
    setFormError("");
    setIsSubmitting(true);
    try {
      await API.post("/auth/reset-password", {
        token,
        new_password: values.new_password,
      });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (e) {
      setFormError(
        formatApiErrorDetail(e?.response?.data?.detail) ||
          "Unable to reset your password. Please request a new link.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-4" data-testid="reset-missing-token">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Invalid link</AlertTitle>
          <AlertDescription>
            This password reset link is missing or malformed. Please request a
            new one.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="w-full">
          <Link to="/forgot-password" data-testid="reset-request-new-link">
            Request a new link
          </Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4" data-testid="reset-success">
        <Alert>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Password updated</AlertTitle>
          <AlertDescription>
            Your password has been changed. Redirecting you to sign in…
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link to="/login" data-testid="reset-go-login">
            Go to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        {formError ? (
          <Alert variant="destructive" data-testid="reset-confirm-error">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Reset failed</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="new_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="****************************"
                  data-testid="reset-new-password-input"
                  {...field}
                />
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
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="****************************"
                  data-testid="reset-confirm-password-input"
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
          data-testid="reset-confirm-submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Updating...
            </>
          ) : (
            "Reset password"
          )}
        </Button>

        <Button asChild variant="link" className="w-full text-muted-foreground">
          <Link to="/login" data-testid="reset-confirm-back-link">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to sign in
          </Link>
        </Button>
      </form>
    </Form>
  );
};
