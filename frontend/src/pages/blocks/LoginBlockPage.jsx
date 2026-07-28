import { PageHeader } from "@/components/layout/PageHeader";

/**
 * LoginBlockPage
 * Preview of the Login block (mirrors the shadcn blocks preview panel). Renders
 * the real standalone /login route inside a bordered, contained iframe frame so
 * the full split-screen layout is shown exactly as used by the system.
 */
export default function LoginBlockPage() {
  return (
    <div className="space-y-6" data-testid="login-block-page">
      <PageHeader
        title="Login"
        description="A split-screen sign-in layout — preview of the current system's login page."
      />

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <iframe
          title="Login block preview"
          src="/login"
          className="h-[680px] w-full border-0 bg-background"
          data-testid="login-block-iframe"
        />
      </div>
    </div>
  );
}
