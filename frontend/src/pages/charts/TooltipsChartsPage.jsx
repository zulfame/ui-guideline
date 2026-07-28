import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/charts/ChartCard";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { monthlyConfig, monthlyData } from "@/config/chartSampleData";

const tickFmt = (value) => value.slice(0, 3);

function TooltipDemo({ content }) {
  return (
    <BarChart data={monthlyData}>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="month"
        tickLine={false}
        axisLine={false}
        tickMargin={10}
        tickFormatter={tickFmt}
      />
      <ChartTooltip cursor={false} content={content} />
      <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
      <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
    </BarChart>
  );
}

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
          <TooltipDemo content={<ChartTooltipContent />} />
        </ChartCard>

        <ChartCard
          title="Line Indicator"
          description="indicator=&quot;line&quot;"
          config={monthlyConfig}
        >
          <TooltipDemo content={<ChartTooltipContent indicator="line" />} />
        </ChartCard>

        <ChartCard
          title="No Indicator"
          description="hideIndicator"
          config={monthlyConfig}
        >
          <TooltipDemo content={<ChartTooltipContent hideIndicator />} />
        </ChartCard>

        <ChartCard
          title="Custom Label"
          description="labelFormatter"
          config={monthlyConfig}
        >
          <TooltipDemo
            content={
              <ChartTooltipContent
                indicator="dashed"
                labelFormatter={(value) => `Month: ${value}`}
              />
            }
          />
        </ChartCard>
      </div>
    </div>
  );
}
