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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { PasswordInput } from "@/components/composite/PasswordInput";
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
          <CardContent className="space-y-[var(--field-gap)]">{children}</CardContent>
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
    </div>
  );
}
