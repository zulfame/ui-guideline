import { useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ComboboxPreview, DatePickerPreview } from "@/components/previews/AdvancedPreviews";

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

export default function FormElementsPage() {
  const [slider, setSlider] = useState([40]);

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
            <Input id="fe-pass" type="password" placeholder="••••••••" />
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
            <ComboboxPreview />
          </div>
        </Field>

        <Field title="Date Picker" testid="fe-datepicker">
          <div className="space-y-2">
            <Label>Date</Label>
            <DatePickerPreview />
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
      </div>
    </div>
  );
}
