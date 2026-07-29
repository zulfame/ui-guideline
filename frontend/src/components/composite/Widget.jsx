import { ArrowUpRight, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function Widget() {
  return (
    <div className="grid w-full max-w-md grid-cols-2 gap-4" data-testid="widget">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Metric One
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">1,248</div>
          <Badge variant="secondary" className="mt-2 gap-1">
            <TrendingUp className="size-3" /> +12.5%
          </Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Metric Two
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">86.4%</div>
          <Badge variant="outline" className="mt-2 gap-1">
            <ArrowUpRight className="size-3" /> Stable
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
