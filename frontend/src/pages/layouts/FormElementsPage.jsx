import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NativeSelect } from "@/components/ui/native-select";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Combobox } from "@/components/composite/Combobox";
import { DatePicker } from "@/components/composite/DatePicker";
import { PasswordInput } from "@/components/composite/PasswordInput";

function Field({ title, children, testid }) {
  return (
    <Card data-testid={testid}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const addUserSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  role: z.string().min(1, "Please select a role"),
});

function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const form = useForm({
    resolver: zodResolver(addUserSchema),
    defaultValues: { fullName: "", email: "", role: "" },
  });

  const onSubmit = (data) => {
    toast.success("User added", { description: data.email });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full" data-testid="fe-add-user-trigger">
          <Plus className="size-4" /> Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="fe-add-user-dialog">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
              <DialogDescription>
                Create a new user account. All fields are required.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 py-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" data-testid="fe-add-user-cancel">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" data-testid="fe-add-user-save">
                Save user
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const FRAMEWORK_OPTIONS = [
  { value: "next", label: "Next.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
];

export default function FormElementsPage() {
  const [slider, setSlider] = useState([40]);
  const [framework, setFramework] = useState("");
  const [date, setDate] = useState();

  return (
    <div className="space-y-6" data-testid="form-elements-page">
      <PageHeader
        title="Form Elements"
        description="A gallery of every form control available in the design system."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field title="Input" testid="fe-input">
          <div className="space-y-2">
            <Label htmlFor="fe-text">Email</Label>
            <Input id="fe-text" type="email" placeholder="name@example.com" />
          </div>
        </Field>

        <Field title="Password" testid="fe-password">
          <div className="space-y-2">
            <Label htmlFor="fe-pass">Password</Label>
            <PasswordInput id="fe-pass" placeholder="••••••••" />
          </div>
        </Field>

        <Field title="Textarea" testid="fe-textarea">
          <div className="space-y-2">
            <Label htmlFor="fe-area">Message</Label>
            <Textarea id="fe-area" placeholder="Type your message..." />
          </div>
        </Field>

        <Field title="Select" testid="fe-select">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Field>

        <Field title="Native Select" testid="fe-native-select">
          <div className="space-y-2">
            <Label>Option</Label>
            <NativeSelect defaultValue="one">
              <option value="one">Option One</option>
              <option value="two">Option Two</option>
              <option value="three">Option Three</option>
            </NativeSelect>
          </div>
        </Field>

        <Field title="Combobox" testid="fe-combobox">
          <div className="space-y-2">
            <Label>Framework</Label>
            <Combobox
              options={FRAMEWORK_OPTIONS}
              value={framework}
              onChange={setFramework}
              placeholder="Select framework..."
              searchPlaceholder="Search framework..."
              data-testid="fe-combobox-trigger"
            />
          </div>
        </Field>

        <Field title="Date Picker" testid="fe-datepicker">
          <div className="space-y-2">
            <Label>Date</Label>
            <DatePicker
              value={date}
              onChange={setDate}
              data-testid="fe-datepicker-trigger"
            />
          </div>
        </Field>

        <Field title="Checkbox" testid="fe-checkbox">
          <div className="space-y-3">
            {["Option One", "Option Two", "Option Three"].map((o, i) => (
              <div key={o} className="flex items-center gap-2">
                <Checkbox id={`fe-cb-${i}`} defaultChecked={i === 0} />
                <Label htmlFor={`fe-cb-${i}`} className="font-normal">
                  {o}
                </Label>
              </div>
            ))}
          </div>
        </Field>

        <Field title="Radio Group" testid="fe-radio">
          <RadioGroup defaultValue="one" className="space-y-2">
            {["one", "two", "three"].map((v, i) => (
              <div key={v} className="flex items-center gap-2">
                <RadioGroupItem value={v} id={`fe-rd-${v}`} />
                <Label htmlFor={`fe-rd-${v}`} className="font-normal">
                  Option {["One", "Two", "Three"][i]}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </Field>

        <Field title="Switch" testid="fe-switch">
          <div className="flex items-center justify-between">
            <Label htmlFor="fe-switch-el" className="font-normal">
              Enable notifications
            </Label>
            <Switch id="fe-switch-el" defaultChecked />
          </div>
        </Field>

        <Field title="Slider" testid="fe-slider">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <Label className="font-normal">Value</Label>
              <span className="text-muted-foreground">{slider[0]}</span>
            </div>
            <Slider value={slider} onValueChange={setSlider} max={100} step={1} />
          </div>
        </Field>

        <Field title="Input OTP" testid="fe-otp">
          <div className="space-y-2">
            <Label>Verification code</Label>
            <InputOTP maxLength={6}>
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        </Field>

        <Field title="Dialog Form" testid="fe-dialog-form">
          <div className="space-y-2">
            <Label>Add user</Label>
            <AddUserDialog />
          </div>
        </Field>
      </div>
    </div>
  );
}
