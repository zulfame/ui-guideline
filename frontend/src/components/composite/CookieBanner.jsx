import { useState } from "react";
import { Cookie, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function CookieBanner() {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid="cookie-banner-reopen"
      >
        Show banner
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-md p-4" data-testid="cookie-banner">
      <div className="flex items-start gap-3">
        <Cookie className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium">We value your privacy</p>
          <p className="text-xs text-muted-foreground">
            Placeholder copy describing cookie usage for analytics and
            preferences.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-7 shrink-0"
          aria-label="Dismiss cookie banner"
          onClick={() => setOpen(false)}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
          Decline
        </Button>
        <Button size="sm" onClick={() => setOpen(false)}>
          Accept all
        </Button>
      </div>
    </Card>
  );
}
