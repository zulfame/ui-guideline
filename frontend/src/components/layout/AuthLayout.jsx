import { GalleryVerticalEnd, Users, ShieldCheck, ScrollText } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { useBranding } from "@/context/BrandingContext";

/**
 * AuthLayout
 * Reusable split-screen shell for all authentication pages
 * (login, forgot password, etc.). Left panel carries the brand,
 * right panel renders the page content (forms/cards).
 *
 * Brand identity (logo, application name, tagline, description, copyright)
 * is driven dynamically by the Branding settings.
 * Composed exclusively from shadcn/ui primitives + lucide-react icons.
 */
const highlights = [
  {
    icon: Users,
    title: "Centralized access control",
    description:
      "Manage users, roles, offices, and levels from a single console.",
  },
  {
    icon: ShieldCheck,
    title: "Security by design",
    description:
      "JWT sessions, brute-force lockout, scoped API keys, and rate limiting.",
  },
  {
    icon: ScrollText,
    title: "Full audit trail",
    description:
      "Every change is logged with who, what, and when for accountability.",
  },
];

export const AuthLayout = ({ children }) => {
  const { branding, assetUrl } = useBranding();

  const appName = branding.app_name || "Application Name";
  const tagline = branding.tagline || "";
  const description =
    branding.meta_description || "Sign in to your account to continue.";
  const copyright =
    branding.copyright_text ||
    `\u00A9 ${new Date().getFullYear()} ${appName}. All rights reserved.`;
  const logoUrl = assetUrl("logo_light") || assetUrl("logo_dark");

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Branding panel — desktop only */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
        {/* Decorative grid overlay — monochrome, fades at the edges */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary-foreground)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary-foreground)/0.06)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_75%)]"
        />

        <div
          className="relative z-10 flex items-center gap-2.5"
          data-testid="auth-brand-desktop"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={appName}
              className="h-9 w-auto max-w-[180px] object-contain"
              data-testid="auth-brand-logo"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-foreground/10 ring-1 ring-inset ring-primary-foreground/20">
              <GalleryVerticalEnd className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <span className="flex flex-col">
            <span
              className="text-sm font-semibold tracking-tight"
              data-testid="auth-brand-name"
            >
              {appName}
            </span>
            {tagline ? (
              <span
                className="text-xs text-primary-foreground/60"
                data-testid="auth-brand-tagline"
              >
                {tagline}
              </span>
            ) : null}
          </span>
        </div>

        <div className="relative z-10 max-w-md space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
              Welcome back
            </h1>
            <p
              className="text-sm leading-relaxed text-primary-foreground/70"
              data-testid="auth-brand-description"
            >
              {description}
            </p>
          </div>

          <Separator className="bg-primary-foreground/15" />

          <ul className="space-y-6">
            {highlights.map(({ icon: Icon, title, description: desc }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-foreground/10">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm leading-relaxed text-primary-foreground/60">
                    {desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p
          className="relative z-10 text-xs text-primary-foreground/50"
          data-testid="auth-brand-copyright"
        >
          {copyright}
        </p>
      </aside>

      {/* Content panel */}
      <main className="flex flex-col items-center justify-center bg-background px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Brand — mobile only */}
          <div
            className="mb-8 flex items-center gap-2.5 lg:hidden"
            data-testid="auth-brand-mobile"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={appName}
                className="h-9 w-auto max-w-[180px] object-contain"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GalleryVerticalEnd className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <span className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {appName}
              </span>
              {tagline ? (
                <span className="text-xs text-muted-foreground">{tagline}</span>
              ) : null}
            </span>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
};
