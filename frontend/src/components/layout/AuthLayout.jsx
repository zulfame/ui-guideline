import { GalleryVerticalEnd, CheckCircle2 } from "lucide-react";

import { Separator } from "@/components/ui/separator";

/**
 * AuthLayout
 * Reusable split-screen shell for all authentication pages
 * (login, forgot password, etc.). Left panel carries the brand,
 * right panel renders the page content (forms/cards).
 *
 * Generic template — no business/domain-specific content.
 * Composed exclusively from shadcn/ui primitives + lucide-react icons.
 */
const highlights = [
  {
    icon: CheckCircle2,
    title: "Feature One",
    description: "Supporting text placeholder for this item.",
  },
  {
    icon: CheckCircle2,
    title: "Feature Two",
    description: "Supporting text placeholder for this item.",
  },
  {
    icon: CheckCircle2,
    title: "Feature Three",
    description: "Supporting text placeholder for this item.",
  },
];

export const AuthLayout = ({ children }) => {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Branding panel — desktop only */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
        {/* Decorative grid overlay — monochrome, fades at the edges */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary-foreground)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary-foreground)/0.06)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_75%)]"
        />

        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-foreground/10 ring-1 ring-inset ring-primary-foreground/20">
            <GalleryVerticalEnd className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            UI Guidelines
          </span>
        </div>

        <div className="relative z-10 max-w-md space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
              Welcome back
            </h1>
            <p className="text-sm leading-relaxed text-primary-foreground/70">
              Sign in to your account to continue. This is a placeholder
              description for the sign-in screen.
            </p>
          </div>

          <Separator className="bg-primary-foreground/15" />

          <ul className="space-y-6">
            {highlights.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-foreground/10">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm leading-relaxed text-primary-foreground/60">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-primary-foreground/50">
          &copy; {new Date().getFullYear()} UI Guidelines. All rights
          reserved.
        </p>
      </aside>

      {/* Content panel */}
      <main className="flex flex-col items-center justify-center bg-background px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Brand — mobile only */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              UI Guidelines
            </span>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
};
