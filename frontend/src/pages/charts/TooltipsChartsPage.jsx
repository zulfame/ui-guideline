import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/charts/ChartCard";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { monthlyConfig, monthlyData } from "@/config/chartSampleData";

const tickFmt = (value) => value.slice(0, 3);

/**
 * NOTE: The chart element must be rendered as a DIRECT child of ChartContainer
 * (which wraps it in a Recharts ResponsiveContainer). Wrapping the chart in a
 * custom component prevents ResponsiveContainer from injecting width/height,
 * so we inline the BarChart in every card.
 */
export default function TooltipsChartsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tooltips"
        description="Tooltip variants for the shadcn chart component (hover a bar to preview)."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Default"
          description="Dot indicator with label"
          config={monthlyConfig}
        >
          <BarChart data={monthlyData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={tickFmt}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} isAnimationActive={false} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} isAnimationActive={false} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Line Indicator"
          description='indicator="line"'
          config={monthlyConfig}
        >
          <BarChart data={monthlyData}>
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
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} isAnimationActive={false} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} isAnimationActive={false} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="No Indicator"
          description="hideIndicator"
          config={monthlyConfig}
        >
          <BarChart data={monthlyData}>
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
              content={<ChartTooltipContent hideIndicator />}
            />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} isAnimationActive={false} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} isAnimationActive={false} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Custom Label"
          description="labelFormatter"
          config={monthlyConfig}
        >
          <BarChart data={monthlyData}>
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
              content={
                <ChartTooltipContent
                  indicator="dashed"
                  labelFormatter={(value) => `Month: ${value}`}
                />
              }
            />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} isAnimationActive={false} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} isAnimationActive={false} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}
