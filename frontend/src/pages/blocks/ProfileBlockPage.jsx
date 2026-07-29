import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const profileSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  bio: z.string().max(200, "Keep it under 200 characters").optional().or(z.literal("")),
  role: z.string().min(1, "Please select a role"),
  emailNotifications: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
});

const defaultValues = {
  fullName: "Jane Doe",
  email: "jane.doe@example.com",
  bio: "",
  role: "member",
  emailNotifications: true,
  marketingEmails: false,
};

function ProfileSettingsCard() {
  const form = useForm({ resolver: zodResolver(profileSchema), defaultValues });
  const { isDirty } = form.formState;

  // Reset baseline to submitted values so the form is no longer "dirty".
  const onSubmit = (data) => {
    toast.success("Changes saved");
    form.reset(data);
  };

  return (
    <Card data-testid="profile-settings-card">
      <CardHeader>
        <CardTitle className="text-base">Profile & Settings</CardTitle>
        <CardDescription>Manage your account details and preferences.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="text-sm">JD</AvatarFallback>
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

            <div className="grid gap-4 md:grid-cols-2">
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
            {isDirty && (
              <span className="mr-auto text-xs text-muted-foreground" data-testid="unsaved-indicator">
                Unsaved changes
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={!isDirty}
              data-testid="profile-cancel-btn"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty} data-testid="profile-save-btn">
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

export default function ProfileBlockPage() {
  return (
    <div className="space-y-6" data-testid="profile-block-page">
      <PageHeader
        title="Profile"
        description="A profile & settings block — account details and preferences with unsaved-changes handling."
      />
      <ProfileSettingsCard />
    </div>
  );
}
