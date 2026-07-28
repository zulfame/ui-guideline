import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

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

export default function AreaChartsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Area Charts"
        description="Sample area charts built with Recharts and the shadcn chart component."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Area Chart"
          description="January - June 2024"
          config={monthlyConfig}
        >
          <AreaChart data={monthlyData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={tickFmt}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="var(--color-desktop)"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
            />
          </AreaChart>
        </ChartCard>

        <ChartCard
          title="Area Chart - Stacked"
          description="January - June 2024"
          config={monthlyConfig}
        >
          <AreaChart data={monthlyData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={tickFmt}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area
              dataKey="mobile"
              type="natural"
              fill="var(--color-mobile)"
              fillOpacity={0.4}
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="var(--color-desktop)"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartCard>
      </div>
    </div>
  );
}
