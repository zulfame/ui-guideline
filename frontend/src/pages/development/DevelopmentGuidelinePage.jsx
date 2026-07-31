import { useParams, Link } from "react-router-dom";
import { Check, X, CheckCircle2, ChevronLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/composite/EmptyState";
import { guidelineGroupById } from "@/config/developmentGuidelines";

/** Blok daftar bertanda ikon (rules / do / don't / checklist). */
function MarkedList({ items, icon: Icon, iconClass }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <Icon
            className={`mt-0.5 size-4 shrink-0 ${iconClass}`}
            aria-hidden="true"
          />
          <span className="text-muted-foreground">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Label kecil seragam untuk sub-bagian di dalam sebuah topik. */
function SectionLabel({ children }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h4>
  );
}

/** Contoh kode benar/salah — memakai <pre> semantik + token warna saja. */
function CodeExample({ label, code, tone }) {
  const toneClass =
    tone === "bad"
      ? "border-destructive/40"
      : "border-border";
  return (
    <div className={`overflow-hidden rounded-md border ${toneClass}`}>
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-1.5">
        {tone === "bad" ? (
          <X className="size-3.5 text-destructive" aria-hidden="true" />
        ) : (
          <Check className="size-3.5 text-foreground" aria-hidden="true" />
        )}
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <pre className="overflow-x-auto bg-muted/20 p-3 text-xs leading-relaxed">
        <code className="font-mono text-foreground">{code}</code>
      </pre>
    </div>
  );
}

function TopicBody({ topic }) {
  return (
    <div className="space-y-4 pt-1">
      {/* Required rules */}
      <div className="space-y-2">
        <SectionLabel>Required Rules</SectionLabel>
        <MarkedList
          items={topic.rules}
          icon={CheckCircle2}
          iconClass="text-foreground"
        />
      </div>

      {/* Do / Don't */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-md border bg-muted/20 p-3">
          <SectionLabel>Do</SectionLabel>
          <MarkedList items={topic.dos} icon={Check} iconClass="text-foreground" />
        </div>
        <div className="space-y-2 rounded-md border bg-muted/20 p-3">
          <SectionLabel>Don&apos;t</SectionLabel>
          <MarkedList items={topic.donts} icon={X} iconClass="text-destructive" />
        </div>
      </div>

      {/* Code example (optional) */}
      {topic.code ? (
        <div className="space-y-2">
          <SectionLabel>Example · {topic.code.language}</SectionLabel>
          <div className="grid gap-3 lg:grid-cols-2">
            <CodeExample label="Correct" code={topic.code.good} tone="good" />
            <CodeExample label="Incorrect" code={topic.code.bad} tone="bad" />
          </div>
        </div>
      ) : null}

      <Separator />

      {/* Checklist */}
      <div className="space-y-2">
        <SectionLabel>Checklist</SectionLabel>
        <MarkedList
          items={topic.checklist}
          icon={CheckCircle2}
          iconClass="text-muted-foreground"
        />
      </div>
    </div>
  );
}

export default function DevelopmentGuidelinePage() {
  const { groupId } = useParams();
  const group = guidelineGroupById[groupId];

  if (!group) {
    return (
      <div className="space-y-6" data-testid="development-guideline-page">
        <PageHeader
          title="Development Guidelines"
          description="Guideline group not found."
        />
        <EmptyState
          variant="no-data"
          title="Guideline not found"
          description="The guideline group you are looking for is not available."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/development">Back to Overview</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const Icon = group.icon;

  return (
    <div className="space-y-6" data-testid="development-guideline-page">
      <PageHeader title={group.title} description={group.summary}>
        <Button asChild variant="outline" size="sm">
          <Link to="/development">
            <ChevronLeft className="size-4" aria-hidden="true" />
            Overview
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md border bg-muted/40">
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <CardTitle className="text-base">{group.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {group.topics.length} topics · click to expand
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto font-normal">
              Mandatory
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion
            type="multiple"
            className="w-full"
            data-testid={`guideline-accordion-${group.id}`}
          >
            {group.topics.map((topic) => (
              <AccordionItem key={topic.id} value={topic.id}>
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                  {topic.title}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="mb-3 text-sm text-foreground">
                    {topic.principle}
                  </p>
                  <TopicBody topic={topic} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
