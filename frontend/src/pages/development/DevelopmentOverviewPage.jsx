import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { guidelineGroups, totalTopics } from "@/config/developmentGuidelines";

/**
 * Development Guidelines — Overview.
 * Grid kartu per grup panduan. Mengikuti pola halaman design system
 * (root `space-y-6`, PageHeader, Card compact, token monochrome).
 */
export default function DevelopmentOverviewPage() {
  return (
    <div className="space-y-6" data-testid="development-overview-page">
      <PageHeader
        title="Development Guidelines"
        description="Mandatory software engineering standards — code, database, data access, API, security, performance, files, monitoring, backup, and documentation."
      >
        <Badge variant="secondary" className="font-normal">
          {guidelineGroups.length} groups · {totalTopics} topics
        </Badge>
      </PageHeader>

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
    </div>
  );
}
