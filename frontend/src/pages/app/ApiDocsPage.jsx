import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, KeyRound, Link2, Search, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { API_BASE, API_DOC_GROUPS, ENDPOINT_DOCS, authBadge } from "@/data/apiDocs";

const GROUP_ICON = { mobile: Smartphone, server: KeyRound };

// Nearest scrollable ancestor — the content region in AppLayout scrolls, not the window.
function getScrollParent(node) {
  let el = node?.parentElement;
  while (el) {
    const oy = getComputedStyle(el).overflowY;
    if (oy === "auto" || oy === "scroll") return el;
    el = el.parentElement;
  }
  return null;
}

function methodClass(method) {
  switch (method) {
    case "GET":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"; // guard-allow: HTTP method color-coding is an intentional dev-docs convention (R47/Changelog)
    case "POST":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25"; // guard-allow: HTTP method color-coding is an intentional dev-docs convention (R47/Changelog)
    case "DELETE":
      return "bg-destructive/10 text-destructive border border-destructive/25";
    default:
      return "bg-muted text-muted-foreground border";
  }
}

// Intentional, documented color exceptions for the developer API reference:
// a dark terminal block for cURL and a green "success" accent. Kept as deliberate
// deviations from the monochrome token system (see Changelog / R05 exception).
const CURL_PRE_CLASS =
  "overflow-x-auto rounded-lg border bg-zinc-950 p-3.5 text-xs leading-relaxed text-zinc-100 dark:bg-zinc-900"; // guard-allow: dark terminal surface for cURL (dev docs)
const OK_PRE_CLASS =
  "overflow-x-auto rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs leading-relaxed"; // guard-allow: success-tinted response block (dev docs)
const OK_DOT_CLASS = "size-1.5 rounded-full bg-emerald-500"; // guard-allow: success accent dot (dev docs)

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy — please copy manually");
    }
  };
  return [copied, copy];
}

function CopyIconButton({ text, testid, label }) {
  const [copied, copy] = useCopy();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
      onClick={() => copy(text)}
      data-testid={testid}
    >
      {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label || "Copy"}
    </Button>
  );
}

function EndpointCard({ doc }) {
  const ab = authBadge(doc.auth);
  return (
    <div
      id={doc.id}
      className="scroll-mt-24 overflow-hidden rounded-xl border bg-card shadow-sm"
      data-testid={`api-doc-${doc.id}`}
    >
      {/* Endpoint header */}
      <div className="border-b bg-muted/30 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${methodClass(doc.method)}`}>
            {doc.method}
          </span>
          <code className="text-sm font-semibold tracking-tight">{doc.path}</code>
          <Badge variant={ab.variant} className="ml-auto font-normal">
            {ab.label}
          </Badge>
        </div>
        <h3 className="mt-2 text-sm font-medium">{doc.title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{doc.note}</p>
      </div>

      {/* Body: request + tabbed responses */}
      <div className="space-y-4 p-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Request
            </span>
            <CopyIconButton text={doc.curl} testid={`api-doc-copy-${doc.id}`} label="Copy cURL" />
          </div>
          <pre className={CURL_PRE_CLASS}>
            <code>{doc.curl}</code>
          </pre>
        </div>

        <Tabs defaultValue="success" className="w-full">
          <TabsList className="h-8 w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="success" className="gap-1.5 text-xs" data-testid={`api-doc-tab-success-${doc.id}`}>
              <span className={OK_DOT_CLASS} /> Success
              <span className="tabular-nums opacity-60">{doc.successLabel || "200"}</span>
            </TabsTrigger>
            <TabsTrigger value="error" className="gap-1.5 text-xs" data-testid={`api-doc-tab-error-${doc.id}`}>
              <span className="size-1.5 rounded-full bg-destructive" /> Error
              <span className="tabular-nums opacity-60">{doc.errorStatus}</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="success" className="mt-2" data-testid={`api-doc-success-${doc.id}`}>
            <pre className={OK_PRE_CLASS}>
              <code>{doc.success}</code>
            </pre>
          </TabsContent>
          <TabsContent value="error" className="mt-2" data-testid={`api-doc-error-${doc.id}`}>
            <pre className="overflow-x-auto rounded-lg border border-destructive/20 bg-destructive/5 p-3.5 text-xs leading-relaxed">
              <code>{doc.error}</code>
            </pre>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(ENDPOINT_DOCS[0]?.id);
  const rootRef = useRef(null);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return API_DOC_GROUPS.map((g) => ({
      ...g,
      items: ENDPOINT_DOCS.filter(
        (d) =>
          d.group === g.id &&
          (!q ||
            d.title.toLowerCase().includes(q) ||
            d.path.toLowerCase().includes(q) ||
            d.method.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  // Scroll-spy: highlight the endpoint currently near the top of the viewport.
  useEffect(() => {
    const ids = grouped.flatMap((g) => g.items.map((d) => d.id));
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return undefined;
    const root = getScrollParent(rootRef.current);
    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        });
        const topmost = ids.find((id) => visible.has(id));
        if (topmost) setActiveId(topmost);
      },
      { root, rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [grouped]);

  const goTo = (e, id) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  };

  return (
    <div ref={rootRef} className="space-y-5" data-testid="api-docs-page">
      {/* Slim header strip (replaces the old intro card) */}
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">API Reference</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Integrate your mobile app or backend. Every response uses a unified envelope —{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{`{ success, data }`}</code> on
            success, <code className="rounded bg-muted px-1 py-0.5 text-xs">{`{ success, message }`}</code>{" "}
            on error. Use an API key created on the Clients page.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
          <code className="w-full min-w-0 max-w-[240px] truncate text-xs" title={API_BASE}>{API_BASE}</code>
          <CopyIconButton text={API_BASE} testid="api-docs-copy-baseurl" />
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left index */}
        <aside className="lg:sticky lg:top-6 lg:w-64 lg:shrink-0" data-testid="api-docs-index">
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter endpoints..."
              className="h-9 pl-8"
              data-testid="api-docs-search"
            />
          </div>
          <nav className="space-y-5">
            {grouped.map((g) => {
              const Icon = GROUP_ICON[g.id] || KeyRound;
              return (
                <div key={g.id} className="space-y-1.5">
                  <div className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Icon className="size-3.5" />
                    {g.title}
                  </div>
                  <ul className="space-y-0.5">
                    {g.items.map((d) => {
                      const active = d.id === activeId;
                      return (
                        <li key={d.id}>
                          <a
                            href={`#${d.id}`}
                            onClick={(e) => goTo(e, d.id)}
                            aria-current={active ? "true" : undefined}
                            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                              active
                                ? "bg-muted font-medium text-foreground"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            }`}
                            data-testid={`api-docs-nav-${d.id}`}
                          >
                            <span
                              className={`w-11 shrink-0 rounded px-1 py-0.5 text-center font-mono text-[10px] font-bold ${methodClass(d.method)}`}
                            >
                              {d.method}
                            </span>
                            <span className="truncate">{d.title}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {grouped.length === 0 && (
              <p className="px-1 text-sm text-muted-foreground" data-testid="api-docs-no-results">
                No endpoints match “{query}”.
              </p>
            )}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-10">
          {grouped.map((g) => (
            <section key={g.id} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">{g.title}</h2>
                <p className="text-xs text-muted-foreground">{g.description}</p>
              </div>
              <div className="space-y-5">
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
