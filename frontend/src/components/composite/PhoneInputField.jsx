import { forwardRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

/* Flag chip (used inside the country dropdown list). */
function FlagComponent({ country, countryName }) {
  const Flag = flags[country];
  return (
    <span className="flex h-4 w-6 shrink-0 overflow-hidden rounded-sm bg-foreground/10 [&_svg]:size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
}

/* Phone number text field (right segment, joined to the country selector). */
const InputComponent = forwardRef(function InputComponent({ className, ...props }, ref) {
  return (
    <Input
      ref={ref}
      className={cn("rounded-s-none", className)}
      autoComplete="tel"
      {...props}
    />
  );
});

/* Country selector — trigger shows the CALLING CODE (not the flag) per spec. */
function CountrySelect({ disabled, value: selectedCountry, options, onChange }) {
  const [open, setOpen] = useState(false);
  const callingCode = selectedCountry
    ? `+${RPNInput.getCountryCallingCode(selectedCountry)}`
    : "Int'l";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          data-testid="phone-country-trigger"
          className="flex shrink-0 gap-1 rounded-e-none border-r-0 px-3 font-normal"
        >
          <span className="text-sm tabular-nums">{callingCode}</span>
          <ChevronsUpDown className="-mr-1 size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="e.g. United States" />
          <CommandList>
            <ScrollArea className="h-64">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {options
                  .filter((o) => o.value)
                  .map(({ value, label }) => (
                    <CommandItem
                      key={value}
                      className="gap-2"
                      onSelect={() => {
                        onChange(value);
                        setOpen(false);
                      }}
                    >
                      <FlagComponent country={value} countryName={label} />
                      <span className="flex-1 text-sm">{label}</span>
                      <span className="text-sm text-muted-foreground">
                        {`+${RPNInput.getCountryCallingCode(value)}`}
                      </span>
                      <Check
                        className={cn(
                          "size-4",
                          value === selectedCountry ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function PhoneInputField() {
  const [value, setValue] = useState();

  return (
    <div data-testid="phone-input" className="w-full max-w-xs">
      <RPNInput.default
        defaultCountry="US"
        value={value}
        onChange={(v) => setValue(v || "")}
        placeholder="Enter contact number"
        countrySelectComponent={CountrySelect}
        inputComponent={InputComponent}
        flagComponent={FlagComponent}
        className="flex items-center"
      />
    </div>
  );
}
