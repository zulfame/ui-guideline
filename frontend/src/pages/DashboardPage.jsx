/**
 * DashboardPage (home)
 * Placeholder content mirroring the official shadcn sidebar demo page:
 * a row of muted blocks + a tall block (to demonstrate the fixed header /
 * scrollable content region). Blocks are decorative surfaces using the
 * `muted` design token.
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
    </div>
  );
}
