# DESIGN SYSTEM — Master Registry (Single Source of Truth)

> **File ini adalah acuan pusat & wajib** untuk seluruh Komponen dan Aturan UI di
> project **UI Guidelines**. Dibangun **secara bertahap**: setiap komponen/aturan
> baru dari halaman apa pun **WAJIB didaftarkan di sini**.
>
> Hubungan antar dokumen:
> - `DESIGN_SYSTEM.md` (file ini) → **registry pusat** Komponen + Aturan (global).
> - `DESIGN_SYSTEM_RULES.md` → **kontrak/governance** (larangan improvisasi, prosedur).
> - `LOGIN_PAGE_SPEC.md` → contoh ekstraksi per-halaman (Login) — bersifat historis.
>
> **Prinsip:** 100% shadcn/ui · token-first · monochrome-first · tanpa improvisasi.
> Jika butuh sesuatu di luar registry → lapor & tunggu persetujuan (lihat governance).

Status:
- ✅ **Established** — sudah dipakai & distandarkan.
- ⚪ **Available** — komponen shadcn tersedia, belum dipakai (aktifkan saat perlu).
- 🔒 **Pending** — menunggu keputusan/persetujuan.

---

# BAGIAN 1 — COMPONENT REGISTRY

## 1.1 Primitives (shadcn/ui — `src/components/ui/`)
Hanya komponen berikut yang dianggap "ada" di design system. Komposisi boleh,
pembuatan primitive baru **dilarang**.

| Komponen | Status | Catatan standar |
|----------|--------|-----------------|
| button | ✅ | Variant: default, secondary, outline, ghost, link, destructive. Size: sm, default, lg, icon. |
| input | ✅ | `h-9`, `text-sm`; selalu berpasangan dengan `Label`/`FormLabel`. |
| label | ✅ | Selalu `htmlFor` terkait input (via `FormLabel`/`FormControl`). |
| card | ✅ | `Card > CardHeader(CardTitle, CardDescription) > CardContent > CardFooter`. |
| checkbox | ✅ | Untuk boolean; dampingi `Label`. |
| separator | ✅ | Pemisah visual (divider) horizontal/vertikal. |
| form | ✅ | Wrapper `react-hook-form`: `Form/FormField/FormItem/FormLabel/FormControl/FormMessage`. |
| sonner (toast) | ✅ | Notifikasi transien; `<Toaster>` dipasang global di `App`. |
| alert | ✅ | Pesan blok. Dipakai form-level (variant `destructive`) untuk error autentikasi di `LoginForm`. |
| scroll-area | ✅ | Area scroll pada nav sidebar. |
| sheet | ✅ | Drawer navigasi mobile (side `left`). |
| breadcrumb | ✅ | Jejak lokasi di header dashboard. |
| avatar | ✅ | Placeholder identitas (header user + footer sidebar). |
| sidebar | ✅ | Komponen sidebar resmi shadcn (diport ke JSX). Dipakai sbg shell dashboard (sidebar-07, collapse-to-icon). Butuh hook `@/hooks/use-mobile` + token `--sidebar-*`. |
| dropdown-menu | ✅ | Menu user di footer sidebar (Account/Settings/Log out). |
| tooltip | ✅ | Tooltip label item nav saat sidebar collapse ke ikon. |
| skeleton | ✅ | Dependensi `SidebarMenuSkeleton` (loading nav). |
| collapsible | ✅ | Submenu sidebar yang bisa dilipat (Sample Blocks, Sample Charts). |
| chart | ✅ | Komponen chart resmi shadcn (diport ke JSX) di atas **recharts@2.15.4**. ChartContainer/ChartTooltip(Content)/ChartLegend(Content)/ChartStyle. |
| card | ✅ | Container konten; dipakai di Login & pembungkus setiap chart (`ChartCard`). |
| accordion, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, calendar, carousel, collapsible, command, context-menu, dialog, drawer, dropdown-menu, hover-card, input-otp, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, sheet, skeleton, slider, switch, table, tabs, textarea, toggle, toggle-group, tooltip | ⚪ | Tersedia; daftarkan sebagai ✅ saat pertama kali dipakai. |

Ikon: **lucide-react** — **WAJIB** & satu-satunya sumber ikon (`h-4 w-4` default, `aria-hidden` bila dekoratif). Emoji / SVG kustom / library ikon lain dilarang (Aturan R09).

## 1.2 Compositions / Patterns (dibangun dari primitives)

| Pattern | Status | Tersusun dari | Lokasi | Reusable untuk |
|---------|--------|---------------|--------|----------------|
| AuthLayout | ✅ | grid + aside/main + Separator + ikon + grid overlay | `components/layout/AuthLayout.jsx` | Semua halaman auth (login, forgot, reset) |
| LoginForm | ✅ | Form, Input, Label, Checkbox, Button, sonner | `components/auth/LoginForm.jsx` | Halaman login |
| Brand/Logo lockup | ✅ | ikon `lucide` dalam kotak `rounded-md` + teks nama | `AuthLayout` | Header/sidebar/auth |
| Password field + toggle | ✅ | Input + Button(ghost) + Eye/EyeOff | `LoginForm` | Form yang butuh password |
| Loading button | ✅ | Button + `Loader2 animate-spin` + disabled | `LoginForm` | Semua aksi async |
| Form-level error alert | ✅ | Alert (destructive) + AlertTitle + AlertDescription + AlertCircle | `LoginForm` | Semua form (error global) |
| AppLayout (dashboard shell) | ✅ | SidebarProvider + Sidebar (collapse-to-icon) + SidebarInset + header (SidebarTrigger + Breadcrumb) + Outlet | `components/layout/AppLayout.jsx` | Semua halaman aplikasi (dashboard) |
| AppSidebar (sidebar-07) | ✅ | Sidebar system: header brand + nav group + user dropdown footer + rail | `components/layout/AppSidebar.jsx` | Sidebar desktop (icon-collapsible) + drawer mobile |
| PageHeader | ✅ | `h1` + deskripsi muted + slot actions | `components/layout/PageHeader.jsx` | Header setiap halaman |
| PlaceholderPage | ✅ | PageHeader + judul dari nav config (via `getBreadcrumb`) | `pages/PlaceholderPage.jsx` | Halaman blank reusable |
| ChartCard | ✅ | Card + header + ChartContainer (anak = 1 elemen chart Recharts) | `components/charts/ChartCard.jsx` | Semua halaman chart |
| Background grid decoration | ✅ | overlay `aria-hidden` + radial mask (token) | `AuthLayout` | Panel/hero gelap |

## 1.3 Elemen Konten (placeholder generik)

| Elemen | Standar |
|--------|---------|
| Nama Aplikasi | `UI Guidelines` (placeholder) |
| Judul / Deskripsi | `CardTitle` + `CardDescription` (muted) |
| Footer | teks `text-xs text-muted-foreground` |
| Pesan validasi | `FormMessage` (`text-destructive`) |

---

# BAGIAN 2 — RULE REGISTRY (Global, berlaku semua halaman)

| # | Aturan | Standar wajib (token/utility) |
|---|--------|-------------------------------|
| R01 | **Layout** | HTML semantik (`main/aside/section/nav`) + Flex/Grid. Kontainer form `max-w-md`/sesuai konteks. |
| R02 | **Grid** | Tailwind grid (`grid`, `grid-cols-*`, `gap-*`). Dekorasi grid berbasis token, low-opacity. |
| R03 | **Spacing** | Skala 4px shadcn (`space-y-*`, `gap-*`, `p-*`). Compact, hindari whitespace berlebih. |
| R04 | **Typography** | **Font wajib: Geist** (primary) · fallback `Inter, system-ui, sans-serif`. Diimpor di `index.css`. Judul `text-2xl`+; body `text-sm/base`; label `text-sm font-medium`; weight 400/500/600; `leading-tight/relaxed`. Dilarang font lain tanpa persetujuan. |
| R05 | **Color** | **Token only** (`bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `text-destructive`, dst). Termasuk keluarga token **`--sidebar-*`** (sidebar) & **`--chart-1..5`** (palet kategori chart). Dilarang warna hardcode/hex. |
| R06 | **Border** | `border-border` (default), `border-input` (field). Tanpa nilai warna literal. |
| R07 | **Radius** | `--radius: 0.5rem` → `rounded-sm/md/lg/xl` (turunan token). |
| R08 | **Shadow** | Shadow bawaan shadcn (`shadow`, `shadow-sm`). Tanpa shadow kustom. |
| R09 | **Icon** | **Wajib `lucide-react`** (satu-satunya sumber ikon). Ukuran default `h-4 w-4`; `aria-hidden` bila dekoratif. Dilarang emoji, SVG inline kustom, atau library ikon lain tanpa persetujuan. |
| R10 | **Responsive** | Mobile-first; breakpoint `sm/md/lg/xl`. Semua halaman wajib responsif. |
| R11 | **Focus State** | `focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none` (bawaan shadcn). |
| R12 | **Hover State** | Pakai hover bawaan varian (`hover:bg-primary/90`, `hover:bg-accent`, `hover:underline`). |
| R13 | **Active State** | Bawaan shadcn via `transition-colors`. Tanpa efek berlebihan. |
| R14 | **Disabled State** | `disabled:opacity-50 disabled:pointer-events-none`. |
| R15 | **Validation State** | `zod` + `react-hook-form` (`zodResolver`); pesan via `FormMessage`; `aria-invalid`. |
| R16 | **Loading State** | `Loader2 animate-spin` + teks status + kontrol disabled selama proses. |
| R17 | **Accessibility** | Label terkait input; `aria-*` untuk kontrol ikon; `aria-hidden` ikon dekoratif; kontras WCAG AA; `<form noValidate>` bila validasi custom. |
| R18 | **Animation / Motion** | Hanya fungsional (`animate-spin`, `transition-colors`). Tanpa animasi dekoratif berat. |
| R19 | **Alignment** | Flex utilities (`items-center`, `justify-between/center`). Konsisten antar elemen. |
| R20 | **Z-Index** | Konten `relative z-10` di atas overlay dekoratif. Hindari z-index acak. |
| R21 | **Overflow** | `overflow-hidden` pada kontainer berdekorasi/berpotensi meluber. |
| R22 | **Form Behavior** | `react-hook-form` (`mode: "onSubmit"`), nilai terkontrol, submit via `handleSubmit`. |
| R23 | **Keyboard Navigation** | Kontrol native (Tab/Shift+Tab); Enter submit; tombol non-submit `type="button"`. |
| R24 | **Error Handling** | Pesan dari schema; feedback aksi via `sonner`/`Alert`. |
| R25 | **Placeholder** | Teks netral/generik (`name@example.com`, `Search...`). |
| R26 | **Empty State** | `Skeleton` untuk loading; teks `No Data Available` untuk kosong. Placeholder surface memakai `bg-muted/50 rounded-xl` (blok dekoratif). |
| R27 | **Branding** | Logo + nama generik, monokrom; tanpa konten bisnis. |
| R28 | **Theme (Light/Dark)** | Token light+dark ada di `index.css` (`:root`/`.dark`). Saat ini **Light only** (toggle 🔒 pending). |
| R29 | **Consistency** | Semua nilai dari token/komponen. Tanpa magic number/warna. |
| R30 | **Reusability** | Utamakan komposisi reusable; pisahkan schema/validasi; hindari duplikasi. |
| R31 | **Content Rule** | Konten generik. Dilarang asumsi nama app/perusahaan/industri/istilah bisnis. |
| R32 | **No Improvisation** | Jika di luar registry → lapor (format governance) & tunggu persetujuan. |
| R33 | **Data Visualization / Charts** | Pakai komponen `chart` resmi + **recharts@2.15.4** (pinned). Warna via `config` (`{ key: { label, color } }`) & `var(--color-KEY)` yang bersumber dari `--chart-1..5`. Elemen chart **wajib anak langsung** `ChartContainer` (jangan dibungkus komponen). Ukuran: `aspect-video` (default), `aspect-square w-full max-w-[320px]` (pie/radar/radial). Warna per-slice via `<Cell>`. **`<Bar>` set `isAnimationActive={false}`** (StrictMode membuat animasi bar tersangkut di 0). Tooltip/legend via `ChartTooltip(Content)`/`ChartLegend(Content)`. Data = placeholder generik. |
| R34 | **App Shell & Scroll** | Shell dashboard: sidebar + header **fixed/diam**. Layout dikunci `h-svh`; hanya area konten (`overflow-y-auto`) yang scroll. Header konten `h-[65px]` agar garis bawahnya sejajar dengan header sidebar (auto 64px + 1px border) → satu garis menerus. Layering z-index konsisten (`z-10`). |
| R35 | **Navigation** | Config nav **terpusat** (`config/navigation.js` → `navSections`), grup ber-label, submenu **collapsible** (`children`), deteksi active-state (exact/prefix), breadcrumb trail diturunkan dari config (`getBreadcrumb`). Sidebar collapse-to-icon + tooltip label saat ringkas; shortcut **Ctrl/Cmd+B**. Link internal via React Router (`Link`/`SidebarMenuButton asChild`). |
| R36 | **Routing** | React Router: layout route induk (`AppLayout` + `<Outlet />`) membungkus halaman; halaman auth standalone (`/login`); redirect root & fallback (`*`) terdefinisi; login sukses → `/`. Rute chart per-tipe → halaman masing-masing. |
| R37 | **Dependency Exception** | Library non-shadcn yang **diizinkan** (dependency resmi/pendukung): **lucide-react** (ikon, R09) & **recharts@2.15.4** (data-viz untuk komponen `chart`, R33). Di luar ini, **dilarang** library UI/komponen lain tanpa persetujuan. |

---

# BAGIAN 3 — PENDING / BUTUH KEPUTUSAN

Item yang ditunda dipindahkan ke **`BACKLOG.md`** (parkir resmi). Ringkasan:

| ID | Item | Status | Keterangan |
|----|------|--------|------------|
| ~~P1~~ | Alert form-level | ✅ Done | Diaktifkan di `LoginForm` (variant `destructive`). |
| B1 | Dark mode toggle | 🔒 Deferred | Fokus Light Mode dulu → lihat `BACKLOG.md`. |
| B2 | Empty State pattern | ⏳ Deferred | Dibuat saat halaman data → lihat `BACKLOG.md`. |

---

# BAGIAN 4 — CARA MENAMBAH (Proses Bertahap)

Setiap kali membangun UI baru:
1. Cek apakah komponen/pola sudah ada di **Bagian 1**. Jika ada → pakai.
2. Jika komponen shadcn tersedia tapi belum dipakai (⚪) → pakai, lalu ubah status jadi ✅.
3. Jika **tidak ada** di shadcn → **jangan improvisasi**; lapor & tunggu persetujuan.
4. Setelah UI selesai → **daftarkan** komponen/pattern baru ke Bagian 1 dan aturan
   baru ke Bagian 2, lalu catat di Changelog.
5. Verifikasi dengan **Checklist** di `DESIGN_SYSTEM_RULES.md` (Bagian 7).

---

# BAGIAN 5 — CHANGELOG

| Tanggal | Perubahan |
|---------|-----------|
| Awal | Seed registry dari halaman **Login**: 6 primitives ✅ (button, input, label, card, checkbox, separator, form, sonner), 6 patterns ✅ (AuthLayout, LoginForm, Brand lockup, Password+toggle, Loading button, Grid decoration), 32 aturan global (R01–R32). |
| Update 1 | **Alert form-level ✅** diaktifkan di `LoginForm` (variant `destructive`, mock auth: `user@example.com` / `password`). `alert` → ✅ di primitives; pattern "Form-level error alert" ditambahkan. Item ditunda (Dark mode, Empty State) dipindah ke `BACKLOG.md`. |
| Update 2 | **Foundations ditetapkan:** Font **Geist** (primary) + fallback `Inter, system-ui, sans-serif` (R04); Ikon **wajib `lucide-react`** (R09). Font diperbarui di `index.css`. |
| Update 3 | **Dashboard shell** ditambahkan: primitives ✅ scroll-area, sheet, breadcrumb, avatar; patterns ✅ AppLayout, AppSidebar, PageHeader. Navigasi terpusat di `src/config/navigation.js` (menu: Dashboard, Components, Blocks, Charts). Rute `/dashboard/*` di `App.js`; login sukses → redirect `/dashboard`. Halaman utama & sub-halaman sengaja **kosong** dulu. |
| Update 4 | **Sidebar resmi shadcn (sidebar-07) ditambahkan ke design system.** Primitive `ui/sidebar.jsx` (diport TSX→JSX, Tailwind v3, `@radix-ui/react-slot`) + hook `hooks/use-mobile.js` + token `--sidebar-*` di `index.css` (dinetralkan ke monochrome) & mapping `colors.sidebar` di `tailwind.config.js`. Primitives ✅ dropdown-menu, tooltip, skeleton mulai dipakai. `AppLayout`/`AppSidebar` di-refactor memakai Sidebar system (collapse-to-icon, keyboard `Ctrl/Cmd+B`, user dropdown → Log out ke `/login`). |\n| Update 5 | **Struktur menu bergrup + submenu collapsible.** `navigation.js` kini `navSections` (grup: Greetings, Design System) dengan item bercabang (`children`); primitive ✅ collapsible dipakai untuk Sample Blocks & Sample Charts. Dashboard dipindah ke `/`; rute `/design-system/{components, blocks/*, charts/*}` (semua **blank**) via `PlaceholderPage` reusable (judul dari nav config). Breadcrumb kini menampilkan trail bertingkat. Login sukses → redirect `/`. |
| Update 6 | **Kustomisasi sidebar-07** (styling, tanpa primitive baru): (a) header sidebar pakai `border-b border-sidebar-border` + `sticky top-0 bg-sidebar`, dan header konten dinaikkan ke `h-16` (64px) agar garis bawah keduanya **sejajar presisi** membentuk satu garis menerus (referensi sidebar-12); (b) blok user footer dibuat "timbul" (`bg-sidebar-accent` + border + `shadow-sm`) menyerupai state hover. |
| Update 7 | **App-shell fixed header + presisi 1px.** Layout dikunci `h-svh`; hanya area konten (`overflow-y-auto`) yang scroll → header & sidebar benar-benar diam. Header konten `h-[65px]` untuk menyamai tinggi header sidebar (auto 64px + 1px border) → garis benar-benar sejajar. |
| Update 8 | **Sample Charts diisi konten.** Ditambahkan primitive resmi ✅ `chart` (`ui/chart.jsx`, diport TSX→JSX) + **recharts di-pin ke `2.15.4`** (versi yang didukung shadcn; recharts 3.x menyebabkan `width(-1)` & render parsial). Pattern ✅ `ChartCard`; data contoh generik di `config/chartSampleData.js`. 7 halaman chart (Area/Bar/Line/Pie/Radar/Radial/Tooltips) via Recharts. Catatan: (a) container pie/radar/radial pakai `aspect-square w-full max-w-[320px]` agar tak kolaps; (b) RadialBar diberi warna per-slice via `<Cell>`; (c) `<Bar>` diberi `isAnimationActive={false}` karena React StrictMode membuat animasi bar tersangkut di tinggi 0; (d) elemen chart harus anak langsung `ChartContainer` (jangan dibungkus komponen). Dashboard `/` diisi blok placeholder (`bg-muted/50`) yang cukup tinggi untuk uji scroll. |
| Update 9 | **Aturan diformalkan.** Ditambahkan **R33 Charts**, **R34 App Shell & Scroll**, **R35 Navigation**, **R36 Routing**, **R37 Dependency Exception**; R05 diperluas (token `--sidebar-*` & `--chart-1..5`); R26 mencatat placeholder surface `bg-muted/50`. Governance (`DESIGN_SYSTEM_RULES.md`) memuat daftar library yang diizinkan (lucide-react, recharts). |
