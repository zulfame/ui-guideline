import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { resetSchema, resetDefaultValues } from "@/lib/validation/authSchema";
import API from "@/lib/api";

/** Normalize FastAPI error `detail` (string | array | object) to a string. */
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
 * ForgotPasswordForm
 * Requests a password-reset link. Calls the backend, which emails a single-use
 * link (via the configured SMTP). Always shows a generic success to avoid
 * revealing whether an account exists.
 */
export const ForgotPasswordForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [formError, setFormError] = useState("");

  const form = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: resetDefaultValues,
    mode: "onSubmit",
  });

  const onSubmit = async (values) => {
    setFormError("");
    setIsSubmitting(true);
    try {
      await API.post("/auth/forgot-password", { email: values.email.trim() });
      setSentTo(values.email.trim());
    } catch (e) {
      setFormError(
        formatApiErrorDetail(e?.response?.data?.detail) ||
          "Unable to send the reset link. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <div className="space-y-6" data-testid="reset-success">
        <Alert>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Check your email</AlertTitle>
          <AlertDescription>
            If an account exists for {sentTo}, a reset link has been sent.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="w-full">
          <Link to="/login" data-testid="reset-back-to-login-link">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to sign in
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
          <Alert variant="destructive" data-testid="reset-error-alert">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  data-testid="reset-email-input"
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
          data-testid="reset-submit-button"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Sending...
            </>
          ) : (
            "Send reset link"
          )}
        </Button>

        <Button asChild variant="link" className="w-full text-muted-foreground">
          <Link to="/login" data-testid="reset-back-link">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to sign in
          </Link>
        </Button>
      </form>
    </Form>
  );
};
