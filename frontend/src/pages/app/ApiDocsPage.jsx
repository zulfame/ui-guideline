import { useState } from "react";
import { Check, Copy, KeyRound, Smartphone, Terminal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { API_DOC_GROUPS, ENDPOINT_DOCS, authBadge } from "@/data/apiDocs";

const GROUP_ICON = { mobile: Smartphone, server: KeyRound };

function methodClass(method) {
  switch (method) {
    case "GET":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
    case "POST":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
    case "DELETE":
      return "bg-destructive/10 text-destructive border border-destructive/20";
    default:
      return "bg-muted text-muted-foreground border";
  }
}

function CopyButton({ text, testid }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy — please copy manually");
    }
  };
  return (
    <Button size="sm" variant="ghost" className="h-7 gap-1.5 px-2 text-xs" onClick={copy} data-testid={testid}>
      {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function CodeBlock({ label, badge, badgeClass, code, tone = "muted", testid }) {
  const toneClass =
    tone === "success"
      ? "border-primary/15 bg-primary/5"
      : tone === "error"
        ? "border-destructive/20 bg-destructive/5"
        : "border-border bg-muted/50";
  return (
    <div className="space-y-1.5" data-testid={testid}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {badge && (
          <Badge variant="outline" className={`font-normal tabular-nums ${badgeClass || ""}`}>
            {badge}
          </Badge>
        )}
      </div>
      <pre className={`overflow-x-auto rounded-lg border p-3.5 text-xs leading-relaxed ${toneClass}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointCard({ doc }) {
  const ab = authBadge(doc.auth);
  return (
    <Card id={doc.id} className="scroll-mt-24" data-testid={`api-doc-${doc.id}`}>
      <CardHeader className="gap-3 space-y-0 border-b">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${methodClass(doc.method)}`}>
            {doc.method}
          </span>
          <code className="text-sm font-semibold tracking-tight">{doc.path}</code>
          <Badge variant={ab.variant} className="ml-auto font-normal">
            {ab.label}
          </Badge>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-medium">{doc.title}</h3>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{doc.note}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Request</span>
            <CopyButton text={doc.curl} testid={`api-doc-copy-${doc.id}`} />
          </div>
          <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3.5 text-xs leading-relaxed">
            <code>{doc.curl}</code>
          </pre>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <CodeBlock
            label="Success response"
            badge={doc.successLabel || "200 OK"}
            badgeClass="border-primary/30 text-primary"
            code={doc.success}
            tone="success"
            testid={`api-doc-success-${doc.id}`}
          />
          <CodeBlock
            label="Error response"
            badge={doc.errorStatus}
            badgeClass="border-destructive/30 text-destructive"
            code={doc.error}
            tone="error"
            testid={`api-doc-error-${doc.id}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ApiDocsPage() {
  const grouped = API_DOC_GROUPS.map((g) => ({
    ...g,
    items: ENDPOINT_DOCS.filter((d) => d.group === g.id),
  }));

  return (
    <div className="space-y-6" data-testid="api-docs-page">
      {/* Intro */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Terminal className="size-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">External / Mobile API</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Integrate your mobile app or backend with these endpoints. All responses use a
              unified envelope — success is{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{`{ "success": true, "data": {…} }`}</code>{" "}
              and errors are{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{`{ "success": false, "message": "…" }`}</code>.
              Replace <code className="rounded bg-muted px-1 py-0.5 text-xs">YOUR_API_KEY</code> with a
              key generated on the Clients page.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left index */}
        <aside className="lg:sticky lg:top-20 lg:w-64 lg:shrink-0" data-testid="api-docs-index">
          <nav className="space-y-5">
            {grouped.map((g) => {
              const Icon = GROUP_ICON[g.id] || Terminal;
              return (
                <div key={g.id} className="space-y-1.5">
                  <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Icon className="size-3.5" />
                    {g.title}
                  </div>
                  <ul className="space-y-0.5">
                    {g.items.map((d) => (
                      <li key={d.id}>
                        <a
                          href={`#${d.id}`}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          data-testid={`api-docs-nav-${d.id}`}
                        >
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${methodClass(d.method)}`}
                          >
                            {d.method}
                          </span>
                          <span className="truncate">{d.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-8">
          {grouped.map((g) => (
            <section key={g.id} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">{g.title}</h2>
                <p className="text-xs text-muted-foreground">{g.description}</p>
              </div>
              <div className="space-y-4">
                {g.items.map((d) => (
                  <EndpointCard key={d.id} doc={d} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
