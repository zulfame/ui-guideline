import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";

/**
 * ChartCard
 * Reusable wrapper: Card + header + ChartContainer.
 * `children` must be a single Recharts chart element.
 */
export const ChartCard = ({
  title,
  description,
  config,
  containerClassName,
  children,
}) => {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={config} className={containerClassName}>
          {children}
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
