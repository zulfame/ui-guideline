import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBranding } from "@/context/BrandingContext";

export default function LoginPage() {
  const { branding } = useBranding();
  const supportEmail = branding.support_email || "";

  return (
    <AuthLayout>
      <Card className="border-border/60">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>

      {supportEmail ? (
        <p
          className="mt-6 text-center text-xs text-muted-foreground"
          data-testid="login-support-note"
        >
          Need help? Contact{" "}
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
