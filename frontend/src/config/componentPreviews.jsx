import { Terminal, Plus, Bold, Italic, Underline, Search, Bell } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { NativeSelect } from "@/components/ui/native-select";
import {
  TypographyH3,
  TypographyInlineCode,
  TypographyLead,
  TypographyMuted,
  TypographyP,
} from "@/components/ui/typography";
import {
  ComboboxPreview,
  DataTablePreview,
  DatePickerPreview,
} from "@/components/previews/AdvancedPreviews";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/components/ui/message";
import {
  Bubble,
  BubbleGroup,
  BubbleContent,
  BubbleReactions,
} from "@/components/ui/bubble";
import { Marker, MarkerIcon, MarkerContent } from "@/components/ui/marker";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
  AttachmentGroup,
} from "@/components/ui/attachment";
import { FileText, ImageIcon, X, GitBranch, Loader2 } from "lucide-react";

const chartData = [
  { m: "A", v: 12 },
  { m: "B", v: 18 },
  { m: "C", v: 9 },
  { m: "D", v: 22 },
  { m: "E", v: 15 },
];
const chartConfig = { v: { label: "Value", color: "hsl(var(--chart-1))" } };

/**
 * Live previews per component (all non-pending components covered).
 * Keyed by the exact `name` used in the Components table. Missing keys (pending
 * components) fall back to an "unavailable" message in the preview dialog.
 * Content is generic placeholder only (Design System rule R31).
 */
export const componentPreviews = {
  Accordion: (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>Section One</AccordionTrigger>
        <AccordionContent>
          Placeholder content for the first collapsible section.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Section Two</AccordionTrigger>
        <AccordionContent>
          Placeholder content for the second collapsible section.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),

  Alert: (
    <Alert>
      <Terminal className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>
        This is a placeholder informational alert message.
      </AlertDescription>
    </Alert>
  ),

  "Alert Dialog": (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Open alert dialog</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This is a placeholder confirmation. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),

  "Aspect Ratio": (
    <div className="w-full max-w-sm">
      <AspectRatio
        ratio={16 / 9}
        className="flex items-center justify-center rounded-md bg-muted"
      >
        <span className="text-sm text-muted-foreground">16 / 9</span>
      </AspectRatio>
    </div>
  ),

  Avatar: (
    <div className="flex items-center gap-4">
      <Avatar>
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
      <Avatar className="h-12 w-12">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    </div>
  ),

  Badge: (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="destructive">Destructive</Badge>
    </div>
  ),

  Breadcrumb: (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Application Name</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Feature One</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Current Page</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),

  Button: (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" aria-label="Add">
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button disabled>Disabled</Button>
      </div>
    </div>
  ),

  Calendar: (
    <Calendar mode="single" className="rounded-md border" />
  ),

  Card: (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-base">Card Title</CardTitle>
        <CardDescription>Card description placeholder.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Placeholder card content.
      </CardContent>
      <CardFooter>
        <Button size="sm">Action</Button>
      </CardFooter>
    </Card>
  ),

  Carousel: (
    <Carousel className="w-full max-w-xs">
      <CarouselContent>
        {[1, 2, 3].map((i) => (
          <CarouselItem key={i}>
            <div className="flex aspect-video items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
              Slide {i}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),

  Chart: (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="m" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="v" fill="var(--color-v)" radius={4} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  ),

  Checkbox: (
    <div className="flex items-center gap-2">
      <Checkbox id="preview-check" defaultChecked />
      <Label htmlFor="preview-check" className="font-normal">
        Accept placeholder terms
      </Label>
    </div>
  ),

  Collapsible: (
    <Collapsible className="w-full max-w-sm space-y-2">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          Toggle section
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="rounded-md border p-3 text-sm text-muted-foreground">
        Placeholder collapsible content.
      </CollapsibleContent>
    </Collapsible>
  ),

  Command: (
    <Command className="rounded-md border">
      <CommandInput placeholder="Type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>Item One</CommandItem>
          <CommandItem>Item Two</CommandItem>
          <CommandItem>Item Three</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),

  "Context Menu": (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-[120px] w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        Right-click here
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Item One</ContextMenuItem>
        <ContextMenuItem>Item Two</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Item Three</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),

  Dialog: (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Placeholder dialog description.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),

  Drawer: (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Drawer Title</DrawerTitle>
            <DrawerDescription>Placeholder drawer description.</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  ),

  "Dropdown Menu": (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Open menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Label</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Item One</DropdownMenuItem>
        <DropdownMenuItem>Item Two</DropdownMenuItem>
        <DropdownMenuItem>Item Three</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),

  "Hover Card": (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link">Hover me</Button>
      </HoverCardTrigger>
      <HoverCardContent>
        <p className="text-sm text-muted-foreground">
          Placeholder hover card content.
        </p>
      </HoverCardContent>
    </HoverCard>
  ),

  Input: (
    <div className="w-full max-w-sm space-y-2">
      <Label htmlFor="preview-input">Label</Label>
      <Input id="preview-input" placeholder="Placeholder text" />
    </div>
  ),

  "Input OTP": (
    <InputOTP maxLength={6}>
      <InputOTPGroup>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  ),

  Label: (
    <div className="flex items-center gap-2">
      <Checkbox id="preview-label-check" />
      <Label htmlFor="preview-label-check">A form label</Label>
    </div>
  ),

  Menubar: (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Open</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Undo</MenubarItem>
          <MenubarItem>Redo</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),

  "Navigation Menu": (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Menu One</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-[220px] gap-1 p-2">
              <NavigationMenuLink className="rounded-md p-2 text-sm hover:bg-accent">
                Link One
              </NavigationMenuLink>
              <NavigationMenuLink className="rounded-md p-2 text-sm hover:bg-accent">
                Link Two
              </NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),

  Pagination: (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),

  Popover: (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm text-muted-foreground">
          Placeholder popover content.
        </p>
      </PopoverContent>
    </Popover>
  ),

  Progress: (
    <div className="w-full max-w-sm space-y-2">
      <Label>Progress</Label>
      <Progress value={62} />
    </div>
  ),

  "Radio Group": (
    <RadioGroup defaultValue="a" className="space-y-2">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="a" id="preview-r-a" />
        <Label htmlFor="preview-r-a" className="font-normal">
          Option A
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="b" id="preview-r-b" />
        <Label htmlFor="preview-r-b" className="font-normal">
          Option B
        </Label>
      </div>
    </RadioGroup>
  ),

  Resizable: (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-[200px] w-full rounded-md border"
    >
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
          Panel One
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
          Panel Two
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),

  "Scroll Area": (
    <ScrollArea className="h-40 w-full max-w-sm rounded-md border p-3">
      <div className="space-y-2 text-sm text-muted-foreground">
        {Array.from({ length: 20 }).map((_, i) => (
          <p key={i}>Scrollable line {i + 1}</p>
        ))}
      </div>
    </ScrollArea>
  ),

  Select: (
    <Select>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Choose one" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="one">Option One</SelectItem>
        <SelectItem value="two">Option Two</SelectItem>
        <SelectItem value="three">Option Three</SelectItem>
      </SelectContent>
    </Select>
  ),

  Separator: (
    <div className="w-full max-w-sm space-y-3 text-sm">
      <p>Content above</p>
      <Separator />
      <p className="text-muted-foreground">Content below</p>
    </div>
  ),

  Sheet: (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Sheet Title</SheetTitle>
          <SheetDescription>Placeholder sheet description.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),

  Sidebar: (
    <div className="h-[260px] w-full overflow-hidden rounded-md border">
      <SidebarProvider className="h-full min-h-0 items-stretch">
        <Sidebar collapsible="none" className="border-r">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Group</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive>Item One</SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>Item Two</SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>Item Three</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
          Content area
        </div>
      </SidebarProvider>
    </div>
  ),

  Skeleton: (
    <div className="w-full max-w-sm space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ),

  Slider: (
    <div className="w-full max-w-sm">
      <Slider defaultValue={[50]} max={100} step={1} />
    </div>
  ),

  Switch: (
    <div className="flex items-center gap-2">
      <Switch id="preview-switch" />
      <Label htmlFor="preview-switch" className="font-normal">
        Enable placeholder setting
      </Label>
    </div>
  ),

  Table: (
    <div className="w-full rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>1</TableCell>
            <TableCell>Item One</TableCell>
            <TableCell className="text-right">
              <Badge>Active</Badge>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>2</TableCell>
            <TableCell>Item Two</TableCell>
            <TableCell className="text-right">
              <Badge variant="outline">Inactive</Badge>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),

  Tabs: (
    <Tabs defaultValue="tab1" className="w-full max-w-sm">
      <TabsList>
        <TabsTrigger value="tab1">Tab One</TabsTrigger>
        <TabsTrigger value="tab2">Tab Two</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1" className="pt-3 text-sm text-muted-foreground">
        Placeholder content for the first tab.
      </TabsContent>
      <TabsContent value="tab2" className="pt-3 text-sm text-muted-foreground">
        Placeholder content for the second tab.
      </TabsContent>
    </Tabs>
  ),

  Textarea: (
    <div className="w-full max-w-sm space-y-2">
      <Label htmlFor="preview-textarea">Message</Label>
      <Textarea id="preview-textarea" placeholder="Type your message here." />
    </div>
  ),

  Toast: (
    <Button
      variant="outline"
      onClick={() =>
        toast("Event created", {
          description: "Placeholder toast notification.",
        })
      }
    >
      Show toast
    </Button>
  ),

  Toggle: (
    <Toggle aria-label="Toggle bold">
      <Bold className="h-4 w-4" aria-hidden="true" />
    </Toggle>
  ),

  "Toggle Group": (
    <ToggleGroup type="multiple">
      <ToggleGroupItem value="bold" aria-label="Bold">
        <Bold className="h-4 w-4" aria-hidden="true" />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <Italic className="h-4 w-4" aria-hidden="true" />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline">
        <Underline className="h-4 w-4" aria-hidden="true" />
      </ToggleGroupItem>
    </ToggleGroup>
  ),

  Tooltip: (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Placeholder tooltip text</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),

  "Button Group": (
    <ButtonGroup>
      <Button variant="outline">One</Button>
      <Button variant="outline">Two</Button>
      <Button variant="outline">Three</Button>
    </ButtonGroup>
  ),

  Combobox: <ComboboxPreview />,

  "Data Table": <DataTablePreview />,

  "Date Picker": <DatePickerPreview />,

  Empty: (
    <Empty className="w-full max-w-sm">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Bell aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No items yet</EmptyTitle>
        <EmptyDescription>Placeholder empty-state description.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm">Primary action</Button>
      </EmptyContent>
    </Empty>
  ),

  Field: (
    <FieldGroup className="w-full max-w-sm">
      <Field>
        <FieldLabel htmlFor="preview-field">Label</FieldLabel>
        <Input id="preview-field" placeholder="Placeholder text" />
        <FieldDescription>Helper text placeholder.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="preview-field-2">Label with error</FieldLabel>
        <Input id="preview-field-2" aria-invalid placeholder="Invalid value" />
        <FieldError>This is a placeholder error message.</FieldError>
      </Field>
    </FieldGroup>
  ),

  "Input Group": (
    <InputGroup className="w-full max-w-sm">
      <InputGroupAddon>
        <Search aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search..." />
    </InputGroup>
  ),

  Item: (
    <Item className="w-full max-w-sm">
      <ItemMedia>
        <Bell aria-hidden="true" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Item Title</ItemTitle>
        <ItemDescription>Placeholder item description.</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button size="sm" variant="outline">
          Action
        </Button>
      </ItemActions>
    </Item>
  ),

  Kbd: (
    <KbdGroup>
      <Kbd>Ctrl</Kbd>
      <span className="text-muted-foreground text-xs">+</span>
      <Kbd>B</Kbd>
    </KbdGroup>
  ),

  Attachment: (
    <div className="w-full max-w-sm space-y-3">
      <Attachment state="done">
        <AttachmentMedia>
          <FileText />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>document-one.pdf</AttachmentTitle>
          <AttachmentDescription>PDF · 2.4 MB</AttachmentDescription>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction aria-label="Remove document-one.pdf">
            <X />
          </AttachmentAction>
        </AttachmentActions>
      </Attachment>
      <Attachment state="uploading">
        <AttachmentMedia>
          <FileText />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle className="animate-pulse">
            file-two.zip
          </AttachmentTitle>
          <AttachmentDescription>Uploading · 64%</AttachmentDescription>
        </AttachmentContent>
      </Attachment>
      <AttachmentGroup>
        <Attachment size="sm" className="w-40">
          <AttachmentMedia>
            <ImageIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>image-one.png</AttachmentTitle>
            <AttachmentDescription>PNG · 820 KB</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
        <Attachment size="sm" className="w-40">
          <AttachmentMedia>
            <FileText />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>data-set.csv</AttachmentTitle>
            <AttachmentDescription>CSV · 18 KB</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      </AttachmentGroup>
    </div>
  ),

  Bubble: (
    <div className="w-full max-w-sm">
      <BubbleGroup>
        <Bubble variant="secondary" align="start">
          <BubbleContent>Placeholder incoming message.</BubbleContent>
        </Bubble>
        <Bubble variant="default" align="end">
          <BubbleContent>Placeholder outgoing message.</BubbleContent>
        </Bubble>
        <Bubble variant="muted" align="start">
          <BubbleContent>A lower-emphasis placeholder bubble.</BubbleContent>
        </Bubble>
        <Bubble variant="outline" align="start">
          <div className="flex flex-col gap-1">
            <BubbleContent>A bubble with a reaction row.</BubbleContent>
            <BubbleReactions align="start" role="img" aria-label="Two reactions">
              <span>👍</span>
              <span>🔥</span>
            </BubbleReactions>
          </div>
        </Bubble>
      </BubbleGroup>
    </div>
  ),

  Marker: (
    <div className="w-full max-w-sm space-y-4">
      <Marker>
        <MarkerIcon>
          <GitBranch />
        </MarkerIcon>
        <MarkerContent>Switched to a new branch</MarkerContent>
      </Marker>
      <Marker role="status">
        <MarkerIcon>
          <Loader2 className="animate-spin" />
        </MarkerIcon>
        <MarkerContent>Processing…</MarkerContent>
      </Marker>
      <Marker variant="separator">
        <MarkerContent>Today</MarkerContent>
      </Marker>
      <Marker variant="border">
        <MarkerContent>Reviewed 8 related files</MarkerContent>
      </Marker>
    </div>
  ),

  Message: (
    <div className="w-full max-w-sm">
      <MessageGroup>
        <Message>
          <MessageAvatar>
            <Avatar className="size-8">
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
          </MessageAvatar>
          <MessageContent>
            <MessageHeader>Application Name</MessageHeader>
            <div className="rounded-lg bg-muted px-3 py-2 text-sm">
              Placeholder incoming message.
            </div>
          </MessageContent>
        </Message>
        <Message align="end">
          <MessageContent>
            <div className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
              Placeholder outgoing message.
            </div>
            <MessageFooter>Delivered</MessageFooter>
          </MessageContent>
        </Message>
      </MessageGroup>
    </div>
  ),

  "Native Select": (
    <div className="w-full max-w-sm">
      <NativeSelect defaultValue="one">
        <option value="one">Option One</option>
        <option value="two">Option Two</option>
        <option value="three">Option Three</option>
      </NativeSelect>
    </div>
  ),

  Spinner: (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <Spinner />
      Loading...
    </div>
  ),

  Typography: (
    <div className="w-full max-w-sm space-y-2 text-left">
      <TypographyH3>Heading</TypographyH3>
      <TypographyLead>A lead paragraph placeholder.</TypographyLead>
      <TypographyP>
        A body paragraph placeholder with an{" "}
        <TypographyInlineCode>inline code</TypographyInlineCode> sample.
      </TypographyP>
      <TypographyMuted>A muted caption placeholder.</TypographyMuted>
    </div>
  ),
};
