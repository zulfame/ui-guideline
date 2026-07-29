import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/composite/PasswordInput";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/sonner";
import { loginSchema, loginDefaultValues } from "@/lib/validation/authSchema";

// MOCK demo credentials (frontend prototype only). Replace with a real API.
const DEMO_CREDENTIALS = { email: "user@example.com", password: "password" };

/**
 * LoginForm
 * Accessible, reusable login form built with react-hook-form + zod validation,
 * composed entirely from shadcn/ui primitives. Generic template content only.
 *
 * NOTE: Authentication is mocked (frontend prototype only). Replace the
 * `onSubmit` body with a real API call when the backend is available.
 */
export const LoginForm = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaultValues,
    mode: "onSubmit",
  });

  const onSubmit = async (values) => {
    setFormError("");
    setIsSubmitting(true);
    // --- MOCKED AUTHENTICATION (frontend prototype) ---
    await new Promise((resolve) => setTimeout(resolve, 900));
    setIsSubmitting(false);

    const isValid =
      values.email === DEMO_CREDENTIALS.email &&
      values.password === DEMO_CREDENTIALS.password;

    if (!isValid) {
      setFormError("Invalid email or password. Please try again.");
      return;
    }

    if (values.remember) {
      window.localStorage.setItem("app.rememberedEmail", values.email);
    } else {
      window.localStorage.removeItem("app.rememberedEmail");
    }

    toast.success("Signed in successfully", {
      description: `Welcome back, ${values.email}.`,
    });
    navigate("/");
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        {formError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Sign in failed</AlertTitle>
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
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot password?
                </Button>
              </div>
              <FormControl>
                <PasswordInput
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="remember"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="font-normal text-muted-foreground">
                Remember me
              </FormLabel>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </Form>
  );
};
