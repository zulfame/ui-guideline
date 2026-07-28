/**
 * DashboardPage (home)
 * Placeholder content mirroring the official shadcn sidebar demo page, with
 * extra blocks so the content is tall enough to demonstrate the fixed header
 * and the scrollable content region. Blocks are decorative surfaces using the
 * `muted` design token.
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-64 rounded-xl bg-muted/50" />
        <div className="h-64 rounded-xl bg-muted/50" />
      </div>
      <div className="h-80 rounded-xl bg-muted/50" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>
      <div className="h-96 rounded-xl bg-muted/50" />
    </div>
  );
}
