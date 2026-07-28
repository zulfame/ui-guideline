import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { monthlyConfig, monthlyData } from "@/config/chartSampleData";

const tickFmt = (value) => value.slice(0, 3);

export default function BarChartsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bar Charts"
        description="Sample bar charts built with Recharts and the shadcn chart component."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Bar Chart"
          description="January - June 2024"
          config={monthlyConfig}
        >
          <BarChart data={monthlyData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={tickFmt}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={8} isAnimationActive={false} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Bar Chart - Multiple"
          description="January - June 2024"
          config={monthlyConfig}
        >
          <BarChart data={monthlyData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={tickFmt}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} isAnimationActive={false} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} isAnimationActive={false} />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}
