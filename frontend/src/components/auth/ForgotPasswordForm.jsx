import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

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

/**
 * ForgotPasswordForm
 * Accessible reset-request form (react-hook-form + zod), composed entirely from
 * shadcn/ui primitives. Generic template content only.
 *
 * NOTE: Submission is mocked (frontend prototype). Replace `onSubmit` with a
 * real API call when the backend is available.
 */
export const ForgotPasswordForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const form = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: resetDefaultValues,
    mode: "onSubmit",
  });

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    // --- MOCKED (frontend prototype) ---
    await new Promise((resolve) => setTimeout(resolve, 900));
    setIsSubmitting(false);
    setSentTo(values.email);
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
