import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, X } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/composite/EmptyState";
import { guidelineGroups, totalTopics } from "@/config/developmentGuidelines";

/** Flat, searchable index of every topic across all groups. */
const searchIndex = guidelineGroups.flatMap((group) =>
  group.topics.map((topic) => ({
    groupId: group.id,
    groupTitle: group.title,
    groupIcon: group.icon,
    topic,
    haystack: [
      group.title,
      topic.title,
      topic.principle,
      ...topic.rules,
      ...topic.dos,
      ...topic.donts,
      ...topic.checklist,
    ]
      .join(" ")
      .toLowerCase(),
  })),
);

/**
 * Development Guidelines — Overview with cross-group search.
 * Empty query → group grid. Non-empty → matched topics grouped by group,
 * each linking to `/development/{groupId}?topic={topicId}` (auto-opens there).
 */
export default function DevelopmentOverviewPage() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return [];
    return searchIndex.filter((entry) => entry.haystack.includes(q));
  }, [q]);

  return (
    <div className="space-y-6" data-testid="development-overview-page">
      <PageHeader
        title="Dev Guidelines"
        description="Mandatory software engineering standards — code, database, data access, API, security, performance, files, monitoring, backup, and documentation."
      >
        <Badge variant="secondary" className="font-normal">
          {guidelineGroups.length} groups · {totalTopics} topics
        </Badge>
      </PageHeader>

      {/* Cross-group search */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guidelines across all groups…"
          className="pl-9 pr-9"
          aria-label="Search guidelines"
          data-testid="guideline-search-input"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            data-testid="guideline-search-clear"
          >
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {q ? (
        /* ── Search results ── */
        results.length > 0 ? (
          <div className="space-y-3" data-testid="guideline-search-results">
            <p className="text-sm text-muted-foreground">
              {results.length} {results.length === 1 ? "topic" : "topics"} match
              &nbsp;&ldquo;{query}&rdquo;
            </p>
            <div className="divide-y rounded-lg border">
              {results.map(({ groupId, groupTitle, groupIcon: Icon, topic }) => (
                <Link
                  key={`${groupId}-${topic.id}`}
                  to={`/development/${groupId}?topic=${topic.id}`}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
                  data-testid={`guideline-result-${topic.id}`}
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{topic.title}</span>
                      <Badge variant="outline" className="font-normal">
                        {groupTitle}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {topic.principle}
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-1 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            variant="no-results"
            title="No matching topics"
            description={`Nothing matches "${query}". Try a different keyword.`}
            action={
              <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                Clear search
              </Button>
            }
          />
        )
      ) : (
        /* ── Group grid ── */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guidelineGroups.map((group) => {
            const Icon = group.icon;
            return (
              <Link
                key={group.id}
                to={`/development/${group.id}`}
                className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                data-testid={`guideline-card-${group.id}`}
              >
                <Card className="h-full transition-colors group-hover:border-foreground/30 group-hover:bg-accent/40">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex size-9 items-center justify-center rounded-md border bg-muted/40">
                        <Icon className="size-4" aria-hidden="true" />
                      </div>
                      <Badge variant="outline" className="font-normal">
                        {group.topics.length} topics
                      </Badge>
                    </div>
                    <CardTitle className="text-base">{group.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {group.summary}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                      View guideline
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
