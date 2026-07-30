import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordInput } from "@/components/composite/PasswordInput";
import { StepIndicator } from "@/components/composite/Stepper";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const wizardSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Minimum 8 characters"),
  fullName: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Please select a role"),
});

const WIZARD_STEPS = ["Account", "Profile", "Review"];
const WIZARD_STEP_FIELDS = [["email", "password"], ["fullName", "role"], []];
const ROLE_LABELS = { admin: "Admin", member: "Member", viewer: "Viewer" };

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

function WizardCard() {
  const [step, setStep] = useState(0);
  const form = useForm({
    resolver: zodResolver(wizardSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "", fullName: "", role: "" },
  });

  const next = async () => {
    const ok = await form.trigger(WIZARD_STEP_FIELDS[step]);
    if (ok) setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const values = form.watch();

  return (
    <Card data-testid="wizard-card">
      <CardHeader>
        <CardTitle className="text-base">Multi-step Wizard</CardTitle>
        <CardDescription>
          Complete each step to finish setup. Validation runs per step.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => toast.success("Setup complete"))} noValidate>
          <CardContent className="space-y-[var(--field-gap)]">
            <div className="mx-auto w-full max-w-md">
              <StepIndicator steps={WIZARD_STEPS} current={step} />
            </div>

            {step === 0 && (
              <div className="mx-auto w-full max-w-md space-y-[var(--field-gap)]" data-testid="wizard-step-account">
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="Create a password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 1 && (
              <div className="mx-auto w-full max-w-md space-y-[var(--field-gap)]" data-testid="wizard-step-profile">
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
            )}

            {step === 2 && (
              <div className="mx-auto w-full max-w-md" data-testid="wizard-step-review">
                <div className="divide-y divide-border rounded-md border border-border">
                  <ReviewRow label="Email" value={values.email} />
                  <ReviewRow label="Password" value={values.password ? "••••••••" : ""} />
                  <ReviewRow label="Full name" value={values.fullName} />
                  <ReviewRow label="Role" value={ROLE_LABELS[values.role]} />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button type="button" variant="outline" onClick={back} disabled={step === 0}>
              Back
            </Button>
            {step < WIZARD_STEPS.length - 1 ? (
              <Button type="button" onClick={next}>
                Next
              </Button>
            ) : (
              <Button type="submit">Finish</Button>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

export default function WizardBlockPage() {
  return (
    <div className="space-y-6" data-testid="wizard-block-page">
      <PageHeader
        title="Wizard"
        description="A multi-step wizard block — stepper indicator with per-step validation."
      />
      <WizardCard />
    </div>
  );
}
