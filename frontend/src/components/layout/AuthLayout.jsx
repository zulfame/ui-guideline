import { Landmark, ShieldCheck, Network, Activity } from "lucide-react";

import { Separator } from "@/components/ui/separator";

/**
 * AuthLayout
 * Reusable split-screen shell for all authentication pages
 * (login, forgot password, etc.). Left panel carries the brand,
 * right panel renders the page content (forms/cards).
 *
 * Composed exclusively from shadcn/ui primitives + lucide-react icons.
 */
const highlights = [
  {
    icon: ShieldCheck,
    title: "Keamanan tingkat enterprise",
    description: "Enkripsi menyeluruh dan kontrol akses berbasis peran.",
  },
  {
    icon: Network,
    title: "Koneksi Host-to-Host",
    description: "Integrasi langsung dan andal dengan mitra perbankan.",
  },
  {
    icon: Activity,
    title: "Pemantauan real-time",
    description: "Visibilitas penuh atas setiap transaksi yang berjalan.",
  },
];

export const AuthLayout = ({ children }) => {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Branding panel — desktop only */}
      <aside className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-foreground/10 ring-1 ring-inset ring-primary-foreground/20">
            <Landmark className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            H2H Payment Hub
          </span>
        </div>

        <div className="max-w-md space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
              Pusat kendali pembayaran Host-to-Host Anda.
            </h1>
            <p className="text-sm leading-relaxed text-primary-foreground/70">
              Kelola, monitor, dan rekonsiliasi seluruh transaksi dalam satu
              platform yang aman dan terpadu.
            </p>
          </div>

          <Separator className="bg-primary-foreground/15" />

          <ul className="space-y-6">
            {highlights.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3.5">
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

        <p className="text-xs text-primary-foreground/50">
          &copy; {new Date().getFullYear()} H2H Payment Hub. Untuk penggunaan
          internal.
        </p>
      </aside>

      {/* Content panel */}
      <main className="flex flex-col items-center justify-center bg-background px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Brand — mobile only */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Landmark className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              H2H Payment Hub
            </span>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
};
