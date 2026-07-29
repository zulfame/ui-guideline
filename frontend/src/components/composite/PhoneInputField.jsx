import { forwardRef, useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

import { Input } from "@/components/ui/input";

const CustomInput = forwardRef(function CustomInput(props, ref) {
  return <Input ref={ref} {...props} />;
});

export function PhoneInputField() {
  const [value, setValue] = useState();

  return (
    <div
      data-testid="phone-input"
      className="w-full max-w-xs [&_.PhoneInputCountry]:mr-2 [&_.PhoneInputInput]:h-9 [&_.PhoneInputInput]:border-none [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:shadow-none [&_.PhoneInputInput]:focus-visible:ring-0"
    >
      <PhoneInput
        international
        defaultCountry="US"
        value={value}
        onChange={setValue}
        inputComponent={CustomInput}
        className="flex items-center"
      />
    </div>
  );
}
