import { PageHeader } from "@/components/layout/PageHeader";

/**
 * ForgotBlockPage
 * Preview of the Forgot Password block (mirrors the shadcn blocks preview
 * panel). Renders the real standalone /forgot-password route inside a bordered,
 * contained iframe frame.
 */
export default function ForgotBlockPage() {
  return (
    <div className="space-y-6" data-testid="forgot-block-page">
      <PageHeader
        title="Forgot"
        description="A split-screen reset-password layout — preview of the current system's forgot page."
      />

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <iframe
          title="Forgot password block preview"
          src="/forgot-password"
          className="h-[680px] w-full border-0 bg-background"
          data-testid="forgot-block-iframe"
        />
      </div>
    </div>
  );
}
