import { useEffect, useState } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { LOGIN } from "@/constants/testIds/auth";

const REMEMBER_KEY = "app.rememberedIdentifier";

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
 * LoginForm
 * Real authentication: signs in with email / username / phone + password via the
 * backend JWT endpoint, then routes to the dashboard. Built from shadcn/ui.
 */
export const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: loginDefaultValues,
    mode: "onSubmit",
  });

  useEffect(() => {
    const remembered = window.localStorage.getItem(REMEMBER_KEY);
    if (remembered) {
      form.setValue("identifier", remembered);
      form.setValue("remember", true);
    }
  }, [form]);

  const onSubmit = async (values) => {
    setFormError("");
    setIsSubmitting(true);
    try {
      const data = await login(values.identifier.trim(), values.password);
      if (values.remember) {
        window.localStorage.setItem(REMEMBER_KEY, values.identifier.trim());
      } else {
        window.localStorage.removeItem(REMEMBER_KEY);
      }
      toast.success("Signed in successfully", {
        description: `Welcome back, ${data?.user?.name || values.identifier}.`,
      });
      navigate(data?.must_change_password ? "/change-password" : "/");
    } catch (e) {
      const status = e?.response?.status;
      const detail = formatApiErrorDetail(e?.response?.data?.detail);
      setFormError(
        detail ||
          (status === 401
            ? "Invalid credentials. Please try again."
            : "Unable to sign in. Please try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        {formError ? (
          <Alert variant="destructive" data-testid="login-error-alert">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Sign in failed</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email, username, or phone</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="username"
                  placeholder="name@example.com"
                  data-testid={LOGIN.identifierInput}
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
                  data-testid={LOGIN.forgotPasswordLink}
                >
                  Forgot password?
                </Button>
              </div>
              <FormControl>
                <PasswordInput
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  data-testid={LOGIN.passwordInput}
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

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          data-testid={LOGIN.submitButton}
        >
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
