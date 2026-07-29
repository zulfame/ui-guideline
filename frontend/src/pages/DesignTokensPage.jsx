import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ── Layer 1 · Primitive scales ── */
const neutralScale = [
  { name: "neutral-0", value: "0 0% 100%" },
  { name: "neutral-50", value: "0 0% 98%" },
  { name: "neutral-100", value: "0 0% 96.1%" },
  { name: "neutral-200", value: "0 0% 89.8%" },
  { name: "neutral-300", value: "0 0% 83.1%" },
  { name: "neutral-400", value: "0 0% 63.9%" },
  { name: "neutral-500", value: "0 0% 45.1%" },
  { name: "neutral-600", value: "0 0% 32.2%" },
  { name: "neutral-700", value: "0 0% 25%" },
  { name: "neutral-800", value: "0 0% 14.9%" },
  { name: "neutral-900", value: "0 0% 9%" },
  { name: "neutral-950", value: "0 0% 3.9%" },
];

const accentPrimitives = [
  { name: "red-500", value: "0 84.2% 60.2%" },
  { name: "red-900", value: "0 62.8% 30.6%" },
];

const chartPrimitives = [
  { name: "hue-chart-1", value: "12 76% 61%" },
  { name: "hue-chart-2", value: "173 58% 39%" },
  { name: "hue-chart-3", value: "197 37% 24%" },
  { name: "hue-chart-4", value: "43 74% 66%" },
  { name: "hue-chart-5", value: "27 87% 67%" },
];

/* ── Layer 2 · Semantic tokens (references shift per theme) ── */
const surfaceTokens = [
  { name: "background", light: "neutral-0", dark: "neutral-950" },
  { name: "foreground", light: "neutral-950", dark: "neutral-50" },
  { name: "card", light: "neutral-0", dark: "neutral-950" },
  { name: "card-foreground", light: "neutral-950", dark: "neutral-50" },
  { name: "popover", light: "neutral-0", dark: "neutral-950" },
  { name: "popover-foreground", light: "neutral-950", dark: "neutral-50" },
  { name: "border", light: "neutral-200", dark: "neutral-800" },
  { name: "input", light: "neutral-200", dark: "neutral-800" },
  { name: "ring", light: "neutral-950", dark: "neutral-300" },
];

const roleTokens = [
  { name: "primary", light: "neutral-900", dark: "neutral-50" },
  { name: "primary-foreground", light: "neutral-50", dark: "neutral-900" },
  { name: "secondary", light: "neutral-100", dark: "neutral-800" },
  { name: "secondary-foreground", light: "neutral-900", dark: "neutral-50" },
  { name: "muted", light: "neutral-100", dark: "neutral-800" },
  { name: "muted-foreground", light: "neutral-500", dark: "neutral-400" },
  { name: "accent", light: "neutral-100", dark: "neutral-800" },
  { name: "accent-foreground", light: "neutral-900", dark: "neutral-50" },
  { name: "destructive", light: "red-500", dark: "red-900" },
  { name: "destructive-foreground", light: "neutral-50", dark: "neutral-50" },
];

/** Layer 1 swatch — raw HSL value chip. */
function PrimitiveSwatch({ name, value }) {
  return (
    <div className="flex items-center gap-3" data-testid={`primitive-${name}`}>
      <div
        className="size-10 shrink-0 rounded-md border border-border"
        style={{ backgroundColor: `hsl(${value})` }}
      />
      <div className="min-w-0">
        <div className="truncate font-mono text-xs font-medium">--{name}</div>
        <div className="truncate font-mono text-xs text-muted-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}

/** Layer 2 swatch — semantic token driven by CSS var (updates live per theme). */
function SemanticSwatch({ name, light, dark }) {
  return (
    <div
      className="flex items-center gap-3 rounded-md border border-border p-3"
      data-testid={`semantic-${name}`}
    >
      <div
        className="size-10 shrink-0 rounded-md border border-border"
        style={{ backgroundColor: `hsl(var(--${name}))` }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-xs font-medium">--{name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <Badge variant="outline" className="font-mono font-normal">
            L · {light}
          </Badge>
          <Badge variant="outline" className="font-mono font-normal">
            D · {dark}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function PrimitiveGroup({ title, description, tokens }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {tokens.map((t) => (
            <PrimitiveSwatch key={t.name} {...t} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SemanticGroup({ title, description, tokens }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tokens.map((t) => (
            <SemanticSwatch key={t.name} {...t} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DesignTokensPage() {
  return (
    <div className="space-y-6" data-testid="design-tokens-page">
      <PageHeader
        title="Design Tokens"
        description="2-layer token architecture — raw primitives (Layer 1) referenced by role-based semantic tokens (Layer 2). Toggle the theme to see semantic swatches remap live."
      />

      {/* Layer 1 */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Badge>Layer 1</Badge>
          <h2 className="text-base font-semibold">Primitives / Reference</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <PrimitiveGroup
            title="Neutral scale"
            description="Monochrome-first foundation. Theme-independent raw HSL values."
            tokens={neutralScale}
          />
          <div className="grid gap-6">
            <PrimitiveGroup
              title="Accent · Destructive"
              description="Red primitives reserved for destructive states."
              tokens={accentPrimitives}
            />
            <PrimitiveGroup
              title="Chart hues"
              description="Categorical hues for data visualization."
              tokens={chartPrimitives}
            />
          </div>
        </div>
      </section>

      {/* Layer 2 */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Badge>Layer 2</Badge>
          <h2 className="text-base font-semibold">Semantic / Alias</h2>
        </div>
        <SemanticGroup
          title="Surfaces & structure"
          description="Backgrounds, surfaces and outlines. L = light mapping · D = dark mapping."
          tokens={surfaceTokens}
        />
        <SemanticGroup
          title="Roles & intents"
          description="Interactive roles and emphasis levels referencing Layer 1 primitives."
          tokens={roleTokens}
        />
      </section>
    </div>
  );
}
