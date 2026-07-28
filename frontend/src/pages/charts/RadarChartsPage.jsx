import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { monthlyConfig, monthlyData } from "@/config/chartSampleData";

const squareContainer = "mx-auto aspect-square w-full max-w-[320px]";

export default function RadarChartsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Radar Charts"
        description="Sample radar charts built with Recharts and the shadcn chart component."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Radar Chart"
          description="January - June 2024"
          config={monthlyConfig}
          containerClassName={squareContainer}
        >
          <RadarChart data={monthlyData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="month" />
            <PolarGrid />
            <Radar
              dataKey="desktop"
              fill="var(--color-desktop)"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ChartCard>

        <ChartCard
          title="Radar Chart - Multiple"
          description="January - June 2024"
          config={monthlyConfig}
          containerClassName={squareContainer}
        >
          <RadarChart data={monthlyData}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <PolarAngleAxis dataKey="month" />
            <PolarGrid />
            <Radar
              dataKey="desktop"
              fill="var(--color-desktop)"
              fillOpacity={0.6}
            />
            <Radar dataKey="mobile" fill="var(--color-mobile)" fillOpacity={0.6} />
            <ChartLegend content={<ChartLegendContent />} />
          </RadarChart>
        </ChartCard>
      </div>
    </div>
  );
}
