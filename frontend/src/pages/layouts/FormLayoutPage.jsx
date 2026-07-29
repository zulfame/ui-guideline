import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

/** Shared card shell: header (title/desc) + form (body + footer w/ submit). */
function FormCard({ title, description, form, onSubmit, submitLabel, children, testid, className }) {
  return (
    <Card data-testid={testid} className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-5">{children}</CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              {submitLabel}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

/* ------------------------------- Login ------------------------------- */
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().default(false),
});

function LoginCard() {
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });
  return (
    <FormCard
      testid="login-card"
      title="Login"
      description="Sign in to your account to continue."
      form={form}
      submitLabel="Sign In"
      onSubmit={() => toast.success("Signed in")}
    >
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
              <PasswordInput placeholder="Enter your password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="remember"
        render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="font-normal">Remember me</FormLabel>
          </FormItem>
        )}
      />
    </FormCard>
  );
}

/* ------------------------------ Register ----------------------------- */
const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function RegisterCard() {
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  return (
    <FormCard
      testid="register-card"
      title="Register"
      description="Create a new account to get started."
      form={form}
      submitLabel="Create Account"
      onSubmit={() => toast.success("Account created")}
    >
      <FormField
        control={form.control}
        name="name"
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
      <FormField
        control={form.control}
        name="confirmPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Confirm password</FormLabel>
            <FormControl>
              <PasswordInput placeholder="Re-enter your password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormCard>
  );
}

/* --------------------------- Reset Password -------------------------- */
const resetSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

function ResetPasswordCard() {
  const form = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });
  return (
    <FormCard
      testid="reset-card"
      title="Reset Password"
      description="Enter your email and we'll send a reset link."
      form={form}
      submitLabel="Send Reset Link"
      onSubmit={() => toast.success("Reset link sent")}
    >
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
    </FormCard>
  );
}

/* -------------------------- Change Password -------------------------- */
const changeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function ChangePasswordCard() {
  const form = useForm({
    resolver: zodResolver(changeSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  return (
    <FormCard
      testid="change-card"
      title="Change Password"
      description="Update the password for your account."
      form={form}
      submitLabel="Update Password"
      onSubmit={() => toast.success("Password updated")}
    >
      <FormField
        control={form.control}
        name="currentPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Current password</FormLabel>
            <FormControl>
              <PasswordInput placeholder="Enter current password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="newPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>New password</FormLabel>
            <FormControl>
              <PasswordInput placeholder="Enter new password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="confirmPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Confirm new password</FormLabel>
            <FormControl>
              <PasswordInput placeholder="Re-enter new password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormCard>
  );
}

/* ------------------------- OTP Verification ------------------------- */
const otpSchema = z.object({
  code: z.string().min(6, "Enter the 6-digit code"),
});

function OtpVerificationCard() {
  const form = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });
  return (
    <FormCard
      testid="otp-card"
      title="OTP Verification"
      description="Enter the 6-digit code sent to your email."
      form={form}
      submitLabel="Verify"
      onSubmit={() => toast.success("Code verified")}
    >
      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Verification code</FormLabel>
            <FormControl>
              <InputOTP maxLength={6} value={field.value} onChange={field.onChange}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormCard>
  );
}

/* ------------------------------ Contact ------------------------------ */
const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  message: z.string().min(1, "Message is required").max(500, "Keep it under 500 characters"),
});

function ContactCard() {
  const form = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", message: "" },
  });
  return (
    <FormCard
      testid="contact-card"
      title="Contact"
      description="Send us a message and we'll get back to you."
      form={form}
      submitLabel="Send Message"
      onSubmit={() => toast.success("Message sent")}
    >
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
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
        name="message"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Message</FormLabel>
            <FormControl>
              <Textarea placeholder="Type your message..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormCard>
  );
}

/* --------------------------- Multi-step Wizard ----------------------- */
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
          <CardContent className="space-y-6">
            <div className="mx-auto w-full max-w-md">
              <StepIndicator steps={WIZARD_STEPS} current={step} />
            </div>

            {step === 0 && (
              <div className="mx-auto w-full max-w-md space-y-5" data-testid="wizard-step-account">
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
              <div className="mx-auto w-full max-w-md space-y-5" data-testid="wizard-step-profile">
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

/* --------------------------- Profile / Settings ---------------------- */
const profileSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  bio: z.string().max(200, "Keep it under 200 characters").optional().or(z.literal("")),
  role: z.string().min(1, "Please select a role"),
  emailNotifications: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
});

function ProfileSettingsCard() {
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      bio: "",
      role: "",
      emailNotifications: true,
      marketingEmails: false,
    },
  });

  return (
    <Card data-testid="profile-settings-card">
      <CardHeader>
        <CardTitle className="text-base">Profile & Settings</CardTitle>
        <CardDescription>Manage your account details and preferences.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => toast.success("Changes saved"))} noValidate>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-base">JD</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <Button type="button" variant="outline" size="sm">
                  Change photo
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPG or PNG. Max size 2MB.
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-5 md:grid-cols-2">
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
            </div>

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

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Tell us a little about yourself..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Preferences */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                    <div className="space-y-0.5">
                      <FormLabel>Email notifications</FormLabel>
                      <FormDescription>Receive emails about account activity.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="marketingEmails"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                    <div className="space-y-0.5">
                      <FormLabel>Marketing emails</FormLabel>
                      <FormDescription>Receive occasional product updates.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

export default function FormLayoutPage() {
  return (
    <div className="space-y-6" data-testid="form-layout-page">
      <PageHeader
        title="Form Layout"
        description="Basic form layouts composed from the design system — auth, verification & contact."
      />
      {/* Compact forms — 3 columns on large screens, 2 on tablet */}
      <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
        <LoginCard />
        <ResetPasswordCard />
        <OtpVerificationCard />
      </div>
      {/* Larger forms — 2 columns */}
      <div className="grid items-start gap-6 md:grid-cols-2">
        <RegisterCard />
        <ChangePasswordCard />
        <ContactCard />
      </div>
      {/* Full-width advanced forms */}
      <WizardCard />
      <ProfileSettingsCard />
    </div>
  );
}
