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
| card | ✅ | Container konten; dipakai di Login, pembungkus setiap chart (`ChartCard`), & pembungkus Table di halaman Components. |
| table | ✅ | Tabel data resmi shadcn. Dipakai di halaman Components (dibungkus Card). Empty state = baris `colSpan` penuh berteks `No Data Available` (R26). |
| badge | ✅ | Status accent. Dipakai di kolom Status halaman Components (variant `default`=Established, `secondary`=Available, `outline`=Pending). |
| dialog | ✅ | Modal preview komponen di halaman Components (`DialogContent/Header/Title/Description`). |
| accordion | ✅ | Didemokan di preview dialog halaman Components (single, collapsible). |
| alert-dialog | ✅ | Didemokan di preview dialog halaman Components (nested trigger + confirm/cancel). |
| aspect-ratio | ✅ | Didemokan di preview dialog halaman Components (rasio 16/9 + surface `bg-muted`). |
| calendar, carousel, command, context-menu, drawer, hover-card, input-otp, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, select, slider, switch, tabs, textarea, toggle, toggle-group | ⚪ | Tersedia; daftarkan sebagai ✅ saat pertama kali dipakai. |

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
| Data Table (card-wrapped) + empty state | ✅ | Card + Table (Header/Body/Row/Head/Cell) + kolom No/Name/Action + tombol preview ikon (Eye) + fallback empty-state `colSpan` "No Data Available" | `pages/ComponentsPage.jsx` | Semua tampilan tabular; kolom action `text-right` (ghost icon button) |
| Component Preview Dialog | ✅ | Dialog + judul (nama + Badge status) + body preview live (`config/componentPreviews.jsx`); fallback "not available"/"not implemented" | `pages/ComponentsPage.jsx` + `config/componentPreviews.jsx` | Preview komponen dari tabel (tombol Eye) |

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
| R03 | **Spacing** | Skala 4px shadcn (`space-y-*`, `gap-*`, `p-*`). Compact/enterprise, hindari whitespace berlebih. Ikuti **Spacing System resmi** (lihat **BAGIAN 2B**) untuk aturan lengkap (margin/padding/gap, section/component/form/card/table/modal/drawer/sidebar/header/list/nav/button/input/icon, container width, responsive, density, do's & don'ts). Nilai `px` arbitrer dilarang kecuali konstanta layout terdokumentasi. |
| R04 | **Typography** | **Font wajib: Geist** (primary) · fallback `Inter, system-ui, sans-serif`. Diimpor di `index.css`. Weight yang dipakai **400/500/600** (700 tersedia, jarang). Ikuti **Skala Tipografi resmi** (lihat **BAGIAN 2A**) untuk ukuran H1→terkecil & aturan `leading`/`tracking`. Warna teks via token semantik (`text-foreground`/`text-muted-foreground`). Dilarang font lain / ukuran di luar skala tanpa persetujuan. |
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

# BAGIAN 2A — TYPOGRAPHY SCALE (resmi, turunan R04)

**Font:** Geist (primary) · fallback `Inter, system-ui, sans-serif`.
**Weight:** 400 (body) · 500 (label/aktif) · 600 (heading). 700 tersedia tapi jarang.
**Skala ukuran = subset Tailwind:** `12 / 14 / 16 / 24 / 30 / 36 px` (sengaja ringkas, gaya enterprise — hindari display size besar tanpa persetujuan).

## 2A.1 Skala ukuran (H1 → terkecil)

| Peran | Kelas Tailwind | px | Weight | Line-height | Tracking |
|-------|----------------|----|--------|-------------|----------|
| **H1 — judul halaman** (`PageHeader`) | `text-2xl font-semibold tracking-tight` | 24 | 600 | `leading-tight` | `tracking-tight` |
| **H1 — hero / auth** (`AuthLayout`) | `text-3xl xl:text-4xl font-semibold leading-tight tracking-tight` | 30→36 | 600 | `leading-tight` | `tracking-tight` |
| **H2 — judul Card besar** (`CardTitle`, auth) | `text-2xl` | 24 | 600 | tight | normal |
| **H3 — judul section / Card kecil** | `text-base font-semibold` | 16 | 600 | normal | normal |
| **Body — UI text default** | `text-sm` | 14 | 400 | `leading-normal` | normal |
| **Body — prosa / deskripsi panjang** | `text-base leading-relaxed` | 16 | 400 | `leading-relaxed` | normal |
| **Label form / meta** | `text-sm font-medium` | 14 | 500 | normal | normal |
| **Deskripsi muted** (`CardDescription`, desc `PageHeader`) | `text-sm text-muted-foreground` | 14 | 400 | normal | normal |
| **Terkecil — caption / footer / hint** | `text-xs text-muted-foreground` | 12 | 400 | normal | normal |

> Belum ada penggunaan `text-lg/xl/5xl/6xl` (sengaja). Butuh ukuran di luar skala → lapor (R32).

## 2A.2 Line-spacing (leading)

- **Heading (H1–H3):** `leading-tight` (≈1.25–1.3) — judul padat & tegas.
- **Body pendek / UI text:** default `leading-normal` (≈1.5).
- **Paragraf/prosa multi-baris:** `leading-relaxed` (≈1.625).
- **Dilarang** `leading-loose` tanpa alasan (terlalu renggang untuk enterprise).
- **`tracking-tight`** hanya untuk heading; body selalu tracking normal.

---

# BAGIAN 2B — SPACING SYSTEM (resmi, turunan R03)

> Basis: **skala 4px shadcn/Tailwind** (`1`=4px, `2`=8px, `4`=16px, `6`=24px, dst).
> Gaya sistem = **compact/enterprise**. Semua komponen (termasuk preview di halaman
> Components) **wajib** mengikuti nilai di bawah. Angka `px` arbitrer **dilarang**
> kecuali konstanta layout terdokumentasi (`h-[65px]`, lebar sidebar `16rem/3rem/18rem`).

**1. Spacing Scale** — Langkah resmi: `0, 0.5(2px), 1(4px), 1.5(6px), 2(8px), 2.5(10px), 3(12px), 4(16px), 5(20px), 6(24px), 8(32px), 10(40px), 14(56px)`. Utamakan langkah genap. Tanpa nilai di luar skala.

**2. Margin** — Hindari margin untuk ritme layout; pakai `gap`/`space-y` pada induk. Margin hanya untuk nudge lokal (mis. `-ml-1` pada `SidebarTrigger`, `mt-6` catatan auth). Jangan campur margin + gap untuk ritme yang sama.

**3. Padding** — Kontainer konten `p-4` → `lg:p-6`. Card/Dialog/Sheet `p-6`. Panel auth `p-10` → `xl:p-14`. Field kecil ikut default komponen (jangan tambah padding manual).

**4. Gap (Flex & Grid)** — Klaster kontrol inline `gap-2` (ikon+teks, header). Grid kartu/section `gap-4`. Internal Dialog/Sheet `gap-4`. Grup padat `gap-1` (menu sidebar).

**5. Section Spacing** — Ritme antar-section di root halaman **`space-y-6`** (24px) — wajib di setiap page root. Hero/auth boleh `space-y-8`.

**6. Component Spacing** — Tumpukan komponen terkait `space-y-4`; grup rapat `space-y-2`.

**7. Form Spacing** — `<form>` antar-field **`space-y-5`**; `FormItem` internal `space-y-2` (label→control→message); baris checkbox `gap-2`.

**8. Card Spacing** — `CardHeader` `p-6 space-y-1.5`; `CardContent` `p-6 pt-0`; `CardFooter` `p-6 pt-0`; antar-kartu di grid `gap-4`. Jangan bungkus padding ganda di dalam Card.

**9. Table Spacing** — `TableHead` `h-10 px-2`; `TableCell` `p-2`; empty-state cell `h-24 text-center`; bungkus tabel `rounded-md border` (padding milik sel, bukan wrapper).

**10. Modal (Dialog) Spacing** — `DialogContent` `p-6 gap-4 max-w-lg`; header `space-y-1.5`; footer `sm:space-x-2`; tombol close `right-4 top-4`. Body preview `min-h-[160px] p-6`.

**11. Drawer (Sheet) Spacing** — `SheetContent` `p-6 gap-4`; header `space-y-2`; footer `sm:space-x-2`; close `right-4 top-4`.

**12. Sidebar Spacing** — Lebar `16rem` (expanded) / `3rem` (icon) / `18rem` (mobile). Grup `p-2`, menu `gap-1`, sub-item indent via `SidebarMenuSub`, header/footer `p-2`.

**13. Header & Toolbar Spacing** — App header `h-[65px] px-4 gap-2`; preview header `h-14 px-4 gap-2`; separator vertikal `h-4` + `mr-1/mx-1`.

**14. List Item Spacing** — Item daftar/menu tumpuk `gap-1`; internal item `gap-2` (ikon+label); padding vertikal ikut default komponen.

**15. Navigation Spacing** — `SidebarGroup` `p-2` + `SidebarGroupLabel`; breadcrumb antar-item `gap-1.5` (default `BreadcrumbList`); crumb antara `hidden md:block`.

**16. Button Internal Spacing** — default `h-9 px-4 py-2 gap-2`; `sm` `h-8 px-3`; `lg` `h-10 px-8`; `icon` `h-9 w-9` (persegi, tanpa `px`). Tombol ikon di tabel `h-8 w-8`.

**17. Input Internal Spacing** — `h-9 px-3 py-1 text-sm`; input dgn ikon trailing `pr-10`; tombol dalam field `absolute right-1`.

**18. Icon Spacing** — Ukuran default `h-4 w-4`; jarak ke teks lewat `gap-2` induk (jangan `ml-*` manual); dekoratif `aria-hidden`.

**19. Content Width & Container Padding** — Area konten `p-4 lg:p-6`; form auth `max-w-md`; Dialog `max-w-lg`; kotak rasio preview `max-w-sm`. Konten selalu di dalam `SidebarInset` (hindari full-bleed).

**20. Responsive Spacing Rules** — Naikkan padding di `lg` (`p-4`→`lg:p-6`), panel auth `p-10`→`xl:p-14`. Grid `1-col`→`md:grid-cols-*`. Jangan pernah lebih rapat dari basis mobile.

**21. Density (Comfortable / Compact)** — Default = **Compact** (kontrol `h-9`, sel tabel `p-2`, `FormItem space-y-2`). Mode "Comfortable" **dicadangkan** (belum aktif). Jangan pakai spacing longgar (`space-y-8`+) di luar hero/auth.

**22. Spacing Do's & Don'ts**
- **Do:** pakai skala 4px; ritme via `gap`/`space-y` induk; `p-6` konsisten untuk Card/Dialog/Sheet; root halaman `space-y-6`.
- **Don't:** nilai `px` arbitrer (kecuali konstanta terdokumentasi); campur `margin`+`gap` untuk ritme sama; padding bersarang berlebih (div ber-padding di dalam Card ber-padding); `space-y` + `gap` pada kontainer yang sama; `m-*` untuk ritme global.

**Tambahan (khusus sistem ini):**
- **23. Chart Spacing** — `ChartCard` = `Card p-6`; chart `margin={{ left: 12, right: 12 }}`; `tickMargin={8}`.
- **24. Empty-state Spacing** — sel `colSpan` `h-24 text-center` (lihat Table Spacing).
- **25. Overlay Offset** — `sideOffset`/`sideOffset={4}` untuk dropdown/tooltip/popover (default shadcn).
- **26. Separator Spacing** — separator vertikal di header `h-4` + `mr-1`; horizontal ikut `space-y` induk (tanpa margin ekstra).

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
| Update 10 | **Sample Blocks lengkap.** (a) `SidebarBlockPage` di-wire ke rute `/design-system/blocks/sidebar` dan dibuat **self-contained/inert**: sidebar preview dibangun langsung dari primitive shadcn + struktur `navSections`, memakai `SidebarMenuButton onClick` (bukan `<Link>`) sehingga **klik menu tidak pernah navigate ke URL host** — hanya memperbarui seleksi lokal (breadcrumb) & menampilkan placeholder kosong (`bg-muted/50`). (b) Pattern ✅ **ForgotPasswordForm** + halaman standalone `/forgot-password` (reuse `AuthLayout`; schema `resetSchema` di `authSchema.js`; sukses → Alert non-destructive). Link "Forgot password?" di `LoginForm` kini navigate ke `/forgot-password`. (c) Pattern ✅ **Block Preview via iframe**: `LoginBlockPage` & `ForgotBlockPage` merender rute nyata (`/login`, `/forgot-password`) di dalam `<iframe>` berbingkai `h-[680px]`. |
| Update 11 | **Typografi diformalkan + halaman Components dikembalikan blank.** (a) Ditambahkan **BAGIAN 2A — Typography Scale** (tabel resmi H1→terkecil: `text-2xl/3xl/4xl` heading, `text-sm/base` body, `text-xs` terkecil; weight 400/500/600; aturan `leading-tight/normal/relaxed` & `tracking-tight` khusus heading); **R04** diperbarui untuk merujuk skala ini. (b) **ComponentsPage dihapus** — rute `/design-system/components` dikembalikan ke `PlaceholderPage` (blank) karena pengisian sebelumnya tidak diinstruksikan user. |
| Update 12 | **Halaman Components mulai diisi (atas instruksi user).** Primitive ✅ **table** diaktifkan. Pattern ✅ **Data Table (card-wrapped)**: `Table` shadcn dibungkus `Card`. Kolom awal: **No** (urut), **Name** (daftar **All Components** shadcn/ui — 63 item, sumber `ui.shadcn.com/docs/components`), **Action** (`text-right`, tombol ghost icon **Eye/preview** dgn `aria-label` + toast placeholder). Tetap ada fallback empty-state R26 (`No Data Available`). Rute `/design-system/components` kembali ke `ComponentsPage`. |
| Update 14 | **Tombol Eye → Preview Dialog nyata (mulai komponen awalan "A").** Pattern ✅ **Component Preview Dialog**: klik Eye membuka `Dialog` berisi judul (nama + Badge status) & **preview live** dari `config/componentPreviews.jsx`. Diimplementasi untuk **Accordion, Alert, Alert Dialog, Aspect Ratio, Avatar** (konten placeholder generik); **Attachment** (pending) menampilkan pesan "not yet available". Primitive ✅ diaktifkan: **dialog, accordion, alert-dialog, aspect-ratio**; status baris tabel untuk komponen ini diperbarui ke Established. Komponen lain (non-A) membuka dialog dengan fallback "Preview not implemented yet". |
| Update 15 | **Spacing System diformalkan.** Ditambahkan **BAGIAN 2B — Spacing System** (26 poin: Spacing Scale, Margin, Padding, Gap, Section, Component, Form, Card, Table, Modal, Drawer, Sidebar, Header/Toolbar, List Item, Navigation, Button, Input, Icon, Content Width & Container Padding, Responsive, Density, Do's & Don'ts + tambahan Chart/Empty-state/Overlay Offset/Separator). Semua nilai diturunkan dari penggunaan nyata (mis. root `space-y-6`, form `space-y-5`, Card/Dialog/Sheet `p-6`, tabel `h-10 px-2`/`p-2`, button `h-9 px-4 py-2 gap-2`, input `h-9 px-3 py-1`, sidebar `16rem/3rem/18rem`). **R03** diperbarui merujuk skala ini. |
| Update 16 | **Menu "Components" jadi grup + submenu.** `navigation.js`: item **Components** kini collapsible dgn children **Base Components** (`/design-system/components/base`) & **Composite Component** (`/design-system/components/composite`). Base = halaman tabel shadcn (judul → "Base Components"); Composite = `PlaceholderPage` (blank, menunggu konten). Rute lama `/design-system/components` → redirect ke `/base`. Sidebar preview & breadcrumb otomatis mengikuti (bersumber dari `navSections`). |
| Update 13 | **Kolom Status ditambahkan di tabel Components.** Tiap komponen shadcn dipetakan ke legenda design system via Badge: **Established** (`default`, sudah dipakai), **Available** (`secondary`, tersedia di `ui/`, belum dipakai), **Pending** (`outline`, belum diport ke `ui/` — mis. Attachment/Bubble/Combobox/Data Table/Date Picker/Field/Spinner/Typography). Primitive ✅ **badge** diaktifkan (dipakai untuk status). |
