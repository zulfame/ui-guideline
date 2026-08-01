import { AuthLayout } from "@/components/layout/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBranding } from "@/context/BrandingContext";

export default function ForgotPasswordPage() {
  const { branding } = useBranding();
  const supportEmail = branding.support_email || "";

  return (
    <AuthLayout>
      <Card className="border-border/60">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>

      {supportEmail ? (
        <p
          className="mt-6 text-center text-xs text-muted-foreground"
          data-testid="reset-support-note"
        >
          Didn&apos;t receive the email? Contact{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {supportEmail}
          </a>
        </p>
      ) : null}
    </AuthLayout>
  );
}
