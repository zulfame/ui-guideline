import { Cell, RadialBar, RadialBarChart } from "recharts";

import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { browserConfig, browserData } from "@/config/chartSampleData";

const squareContainer = "mx-auto aspect-square w-full max-w-[320px]";

export default function RadialChartsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Radial Charts"
        description="Sample radial charts built with Recharts and the shadcn chart component."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Radial Chart"
          description="January - June 2024"
          config={browserConfig}
          containerClassName={squareContainer}
        >
          <RadialBarChart data={browserData} innerRadius={30} outerRadius={110}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="browser" />}
            />
            <RadialBar dataKey="visitors" background cornerRadius={4}>
              {browserData.map((entry) => (
                <Cell key={entry.browser} fill={entry.fill} />
              ))}
            </RadialBar>
          </RadialBarChart>
        </ChartCard>

        <ChartCard
          title="Radial Chart - Legend"
          description="January - June 2024"
          config={browserConfig}
          containerClassName={squareContainer}
        >
          <RadialBarChart data={browserData} innerRadius={30} outerRadius={110}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="browser" />}
            />
            <RadialBar dataKey="visitors" background cornerRadius={4}>
              {browserData.map((entry) => (
                <Cell key={entry.browser} fill={entry.fill} />
              ))}
            </RadialBar>
            <ChartLegend
              content={<ChartLegendContent nameKey="browser" />}
              className="-translate-y-2 flex-wrap gap-2 [&>*]:justify-center"
            />
          </RadialBarChart>
        </ChartCard>
      </div>
    </div>
  );
}
