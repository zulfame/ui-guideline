import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

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

export default function LineChartsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Line Charts"
        description="Sample line charts built with Recharts and the shadcn chart component."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Line Chart"
          description="January - June 2024"
          config={monthlyConfig}
        >
          <LineChart data={monthlyData} margin={{ left: 12, right: 12 }}>
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
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              dataKey="desktop"
              type="natural"
              stroke="var(--color-desktop)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartCard>

        <ChartCard
          title="Line Chart - Multiple"
          description="January - June 2024"
          config={monthlyConfig}
        >
          <LineChart data={monthlyData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={tickFmt}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="desktop"
              type="monotone"
              stroke="var(--color-desktop)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="mobile"
              type="monotone"
              stroke="var(--color-mobile)"
              strokeWidth={2}
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartCard>
      </div>
    </div>
  );
}
