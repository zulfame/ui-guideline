import { Bell, Check, Mail } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Section wrapper: a titled card used for each primitive group. */
const Section = ({ title, description, children, testid }) => (
  <Card data-testid={testid}>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      {description ? <CardDescription>{description}</CardDescription> : null}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const rows = [
  { id: "INV-001", name: "Item One", status: "Active" },
  { id: "INV-002", name: "Item Two", status: "Pending" },
  { id: "INV-003", name: "Item Three", status: "Inactive" },
];

export default function ComponentsPage() {
  return (
    <div className="space-y-6" data-testid="components-page">
      <PageHeader
        title="Components"
        description="Showcase of standard shadcn/ui primitives used across the design system."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Buttons */}
        <Section
          title="Buttons"
          description="Variants and sizes."
          testid="section-buttons"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button data-testid="btn-default">Default</Button>
              <Button variant="secondary" data-testid="btn-secondary">
                Secondary
              </Button>
              <Button variant="outline" data-testid="btn-outline">
                Outline
              </Button>
              <Button variant="ghost" data-testid="btn-ghost">
                Ghost
              </Button>
              <Button variant="destructive" data-testid="btn-destructive">
                Destructive
              </Button>
              <Button variant="link" data-testid="btn-link">
                Link
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" data-testid="btn-sm">
                Small
              </Button>
              <Button data-testid="btn-md">Medium</Button>
              <Button size="lg" data-testid="btn-lg">
                Large
              </Button>
              <Button size="icon" aria-label="Notifications" data-testid="btn-icon">
                <Bell className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button disabled data-testid="btn-disabled">
                Disabled
              </Button>
            </div>
          </div>
        </Section>

        {/* Badges */}
        <Section
          title="Badges"
          description="Status accents only — monochrome first."
          testid="section-badges"
        >
          <div className="flex flex-wrap gap-2">
            <Badge data-testid="badge-default">Default</Badge>
            <Badge variant="secondary" data-testid="badge-secondary">
              Secondary
            </Badge>
            <Badge variant="outline" data-testid="badge-outline">
              Outline
            </Badge>
            <Badge variant="destructive" data-testid="badge-destructive">
              Destructive
            </Badge>
          </div>
        </Section>

        {/* Inputs */}
        <Section
          title="Form Inputs"
          description="Text, textarea and select controls."
          testid="section-inputs"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="demo-input">Label</Label>
              <Input
                id="demo-input"
                placeholder="Placeholder text"
                data-testid="input-text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-textarea">Message</Label>
              <Textarea
                id="demo-textarea"
                placeholder="Type your message here."
                data-testid="input-textarea"
              />
            </div>
            <div className="space-y-2">
              <Label>Select an option</Label>
              <Select>
                <SelectTrigger data-testid="select-trigger">
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one">Option One</SelectItem>
                  <SelectItem value="two">Option Two</SelectItem>
                  <SelectItem value="three">Option Three</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        {/* Selection controls */}
        <Section
          title="Selection Controls"
          description="Checkbox, radio and switch."
          testid="section-selection"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Checkbox id="demo-check" data-testid="checkbox-demo" />
              <Label htmlFor="demo-check" className="font-normal">
                Accept placeholder terms
              </Label>
            </div>
            <RadioGroup defaultValue="a" className="space-y-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="a" id="r-a" data-testid="radio-a" />
                <Label htmlFor="r-a" className="font-normal">
                  Option A
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="b" id="r-b" data-testid="radio-b" />
                <Label htmlFor="r-b" className="font-normal">
                  Option B
                </Label>
              </div>
            </RadioGroup>
            <div className="flex items-center gap-2">
              <Switch id="demo-switch" data-testid="switch-demo" />
              <Label htmlFor="demo-switch" className="font-normal">
                Enable placeholder setting
              </Label>
            </div>
          </div>
        </Section>

        {/* Tabs */}
        <Section
          title="Tabs"
          description="Segmented content switcher."
          testid="section-tabs"
        >
          <Tabs defaultValue="tab1">
            <TabsList data-testid="tabs-list">
              <TabsTrigger value="tab1" data-testid="tab-1">
                Tab One
              </TabsTrigger>
              <TabsTrigger value="tab2" data-testid="tab-2">
                Tab Two
              </TabsTrigger>
            </TabsList>
            <TabsContent value="tab1" className="pt-3 text-sm text-muted-foreground">
              Placeholder content for the first tab.
            </TabsContent>
            <TabsContent value="tab2" className="pt-3 text-sm text-muted-foreground">
              Placeholder content for the second tab.
            </TabsContent>
          </Tabs>
        </Section>

        {/* Feedback */}
        <Section
          title="Feedback & Status"
          description="Alert, progress and skeleton."
          testid="section-feedback"
        >
          <div className="space-y-4">
            <Alert data-testid="alert-demo">
              <Mail className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Heads up</AlertTitle>
              <AlertDescription>
                This is a placeholder informational message.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label>Progress</Label>
              <Progress value={62} data-testid="progress-demo" />
            </div>
            <div className="space-y-2">
              <Label>Loading state</Label>
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>
        </Section>

        {/* Avatar + Tooltip */}
        <Section
          title="Avatar & Tooltip"
          description="Identity and hover hints."
          testid="section-avatar"
        >
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <Separator orientation="vertical" className="h-8" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" data-testid="tooltip-trigger">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Hover me
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Placeholder tooltip text</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </Section>

        {/* Table */}
        <Section
          title="Table"
          description="Tabular data with status badges."
          testid="section-table"
        >
          <Table data-testid="table-demo">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.id}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        row.status === "Active"
                          ? "default"
                          : row.status === "Pending"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      </div>
    </div>
  );
}
