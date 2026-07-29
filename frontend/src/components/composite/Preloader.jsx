import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export function Preloader() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="w-full max-w-md space-y-4" data-testid="preloader">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLoading((l) => !l)}
        data-testid="preloader-toggle"
      >
        {loading ? "Show content" : "Show loading"}
      </Button>
      {loading ? (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Loading…
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="rounded-lg border p-4 text-sm">
          Content loaded. This is placeholder content.
        </div>
      )}
    </div>
  );
}
