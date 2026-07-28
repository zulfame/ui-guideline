import { Pie, PieChart } from "recharts";

import { PageHeader } from "@/components/layout/PageHeader";
import { ChartCard } from "@/components/charts/ChartCard";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { browserConfig, browserData } from "@/config/chartSampleData";

const squareContainer = "mx-auto aspect-square w-full max-w-[320px]";

export default function PieChartsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pie Charts"
        description="Sample pie charts built with Recharts and the shadcn chart component."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Pie Chart"
          description="January - June 2024"
          config={browserConfig}
          containerClassName={squareContainer}
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent nameKey="visitors" hideLabel />}
            />
            <Pie data={browserData} dataKey="visitors" nameKey="browser" />
          </PieChart>
        </ChartCard>

        <ChartCard
          title="Pie Chart - Donut"
          description="January - June 2024"
          config={browserConfig}
          containerClassName={squareContainer}
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent nameKey="visitors" hideLabel />}
            />
            <Pie
              data={browserData}
              dataKey="visitors"
              nameKey="browser"
              innerRadius={60}
            />
          </PieChart>
        </ChartCard>
      </div>
    </div>
  );
}
