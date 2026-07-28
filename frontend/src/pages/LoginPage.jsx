import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <AuthLayout>
      <Card className="border-border/60">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-2xl">Masuk ke akun Anda</CardTitle>
          <CardDescription>
            Masukkan kredensial Anda untuk mengakses H2H Payment Hub.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Akses hanya untuk pengguna internal yang berwenang.
      </p>
    </AuthLayout>
  );
}
