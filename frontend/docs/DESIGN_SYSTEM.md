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
| card | ✅ | Struktur: `Card > CardHeader(CardTitle, CardDescription) > CardContent > CardFooter`. Dipakai di Login, pembungkus tiap chart (`ChartCard`), & pembungkus Table di halaman Components. |
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
| table | ✅ | Tabel data resmi shadcn. Dipakai di halaman Components (dibungkus Card). Empty state = baris `colSpan` penuh berteks `No Data Available` (R26). |
| badge | ✅ | Status accent. Dipakai di kolom Status halaman Components (variant `default`=Established, `secondary`=Available, `outline`=Pending). |
| dialog | ✅ | Modal preview komponen di halaman Components (`DialogContent/Header/Title/Description`). |
| accordion | ✅ | Didemokan di preview dialog halaman Components (single, collapsible). |
| alert-dialog | ✅ | Didemokan di preview dialog halaman Components (nested trigger + confirm/cancel). |
| aspect-ratio | ✅ | Didemokan di preview dialog halaman Components (rasio 16/9 + surface `bg-muted`). |
| calendar, carousel, command, context-menu, drawer, hover-card, input-otp, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, select, slider, switch, tabs, textarea, toggle, toggle-group | ✅ | Established — semua punya preview live di halaman Base Components. |
| spinner, kbd, empty, button-group, input-group, field, item, native-select, typography | ✅ | Diport & Established (Update 23) dengan preview live. |
| attachment, bubble, marker, message | ✅ | Chat/AI kit presentational (100% Tailwind + cva, pola shadcn base). Established dengan preview (Update 24). |
| message-scroller | ✅ | Versi **styled** (tanpa engine `@shadcn/react`): Context lokal + auto-scroll-to-bottom + tombol jump-to-latest. Established (Update 25). |

> **Base Components: 61/61 Established.** Semua primitive shadcn/ui resmi kini diport ke `src/components/ui/` dan memiliki preview live.

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
| Composite Components Table + Dialog | ✅ | Card + Table (kolom No/Name/**Dependency**/Status/Action) + Dialog preview live (`config/compositePreviews.jsx`) | `pages/CompositeComponentsPage.jsx` + `config/compositePreviews.jsx` | Katalog composite (kini digabung ke halaman Components — lihat Update 27) |
| DataTable layout | ✅ | Toolbar (search + Columns + Add) + Table + row-selection (Checkbox + select-all) + sortable header + status Badge + row actions (DropdownMenu) + pagination | `pages/layouts/DataTableLayoutPage.jsx` | Halaman list/tabel data |
| Form Elements gallery | ✅ | Grid Card per elemen form (Input/Textarea/Select/Native Select/Combobox/Date Picker/Checkbox/Radio Group/Switch/Slider/Input OTP) + Label | `pages/layouts/FormElementsPage.jsx` | Referensi elemen form |
| Form Layout (sectioned) | ✅ | Form (`react-hook-form`+`zod`) bersection + 2-kolom grid + Separator + Switch row + Save/Cancel | `pages/layouts/FormLayoutPage.jsx` | Halaman form create/edit |

## 1.3 Elemen Konten (placeholder generik)

| Elemen | Standar |
|--------|---------|
| Nama Aplikasi | `UI Guidelines` (placeholder) |
| Judul / Deskripsi | `CardTitle` + `CardDescription` (muted) |
| Footer | teks `text-xs text-muted-foreground` |
| Pesan validasi | `FormMessage` (`text-destructive`) |

## 1.4 Composite Components (`src/components/composite/`)

Pola pakai-ulang yang **disusun dari primitives Bagian 1.1** (+ dependency yang diizinkan R37).
Bukan primitive baru. Terdaftar & dipreview di halaman **"Composite Component"**. Semua **✅ Established**,
konten generik, monochrome-first.

| Composite | Tersusun dari (base) | Dependency (R37) | File |
|-----------|----------------------|------------------|------|
| Autocomplete | Command + Popover + Button | — | `Autocomplete.jsx` |
| Rating | (Tailwind + ikon `Star`) | — | `Rating.jsx` |
| Stepper | Button + ikon `Check` | — | `Stepper.jsx` |
| List | Item(+Group) + Separator + Button | — | `ListView.jsx` |
| Cookie Banner | Card + Button + ikon | — | `CookieBanner.jsx` |
| Preloader | Spinner + Skeleton + Button | — | `Preloader.jsx` |
| Widget | Card + Badge + ikon | — | `Widget.jsx` |
| Placeholder | Empty (+Header/Media/Title/Description/Content) + Button | — | `PlaceholderState.jsx` |
| Data Grid | Table + Input + Badge + Button (filter/sort/pagination) | `@tanstack/react-table` | `DataGrid.jsx` |
| Code Block | Button + ikon (Copy/Check) | `react-syntax-highlighter` (Prism `oneLight`) | `CodeBlock.jsx` |
| Markdown | (child-selector styling) | `react-markdown` + `remark-gfm` | `MarkdownRenderer.jsx` |
| Phone Input | Input (via `inputComponent`) | `react-phone-number-input` | `PhoneInputField.jsx` |
| Input Mask | Label (+ input bermask) | `react-imask` | `MaskedInput.jsx` |
| Kanban | Card + Badge + ikon (drag) | `@dnd-kit/core` + `sortable` + `utilities` | `KanbanBoard.jsx` |
| Sortable | (Tailwind + ikon `GripVertical`) | `@dnd-kit/sortable` + `core` + `utilities` | `SortableList.jsx` |

> **Aturan composite:** (a) tiap dependency HANYA dipakai oleh composite terkait — jangan menyebar;
> (b) tidak boleh membuat primitive UI baru — komposisi saja; (c) konten wajib placeholder generik (R31).

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
| R37 | **Dependency Exception** | Library non-shadcn yang **diizinkan** (dependency resmi/pendukung). **Global:** **lucide-react** (ikon, R09), **recharts@2.15.4** (chart, R33). **Terikat komponen (hanya boleh dipakai composite terkait di 1.4):** `@tanstack/react-table` (Data Table & Data Grid), `react-syntax-highlighter` (Code Block), `react-markdown`+`remark-gfm` (Markdown), `react-phone-number-input` (Phone Input), `react-imask` (Input Mask), `@dnd-kit/core`+`@dnd-kit/sortable`+`@dnd-kit/utilities` (Kanban & Sortable). Setiap dependency **tidak boleh menyebar** ke luar komponennya. Di luar daftar ini, library UI/komponen lain **dilarang** tanpa persetujuan. |

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
- **23. Chart Spacing** — `ChartCard` = `Card p-6` (CardTitle `text-base`); chart `margin={{ left: 12, right: 12 }}` (area/line); `tickMargin={8}` (semua chart, konsisten).
- **24. Empty-state Spacing** — sel `colSpan` `h-24 text-center` (lihat Table Spacing).
- **25. Overlay Offset** — `sideOffset`/`sideOffset={4}` untuk dropdown/tooltip/popover (default shadcn).
- **26. Separator Spacing** — separator vertikal di header `h-4` + `mr-1`; horizontal ikut `space-y` induk (tanpa margin ekstra).

---

# BAGIAN 2C — EXTENDED REGISTRIES & RULES

> Penambahan (tidak menggantikan Bagian 1/2/2A/2B/R01–R37). Bila sebuah topik sudah
> punya aturan, sub-bagian ini **merujuk** ke sana (bukan menduplikasi) dan hanya
> menambah yang belum ada. Semua komponen/halaman **wajib** mengacu ke registri ini.

## 2C.1 State Registry (global)

Sumber tunggal state komponen. Setiap komponen mengacu ke tabel ini (memperluas R11–R16).

| State | Utility/Token kanonik | Catatan |
|-------|-----------------------|---------|
| Default | token semantik dasar (`bg-*`, `text-*`, `border-*`) | Kondisi awal. |
| Hover | varian bawaan (`hover:bg-primary/90`, `hover:bg-accent`, `hover:underline`) | R12. |
| Focus | `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring` | R11; ring dari `--ring`. |
| Active/Pressed | `transition-colors` + perubahan warna varian / `data-[state=active]` | R13. |
| Disabled | `disabled:opacity-50 disabled:pointer-events-none` | R14. |
| Loading | `Loader2 animate-spin` + teks status + kontrol disabled | R16. |
| Error/Invalid | `aria-invalid` + `FormMessage` `text-destructive` (+ Alert destructive form-level) | R15/R24. |
| Success | Alert non-destructive / teks `text-xs` konfirmasi (mis. reset sukses) | Feedback positif; hemat warna. |
| Readonly | `readOnly` + `bg-muted/50 cursor-default` (tanpa `opacity-50`) | Berbeda dari disabled (nilai tetap terbaca). |

## 2C.2 Size System (global — SSOT dimensi)

SSOT untuk **dimensi** (tinggi/lebar/ukuran ikon). 2B mengatur **jarak** (gap/padding);
di sini **dimensi**. Komponen **dilarang** menentukan ukuran sendiri bila standar ada.

| Aspek | Nilai standar |
|-------|---------------|
| Control height (button/input/select) | `sm` 2rem(32) · **default 2.25rem(36) `h-9`** · `lg` 2.5rem(40) |
| Icon button | `h-9 w-9` (default) · `h-8 w-8` (padat, mis. aksi tabel) |
| Icon size | 14 (`h-3.5`) · **16 (`h-4 w-4`) default** · 20 (`h-5`) · 24 (`h-6`) |
| Table head height | `h-10` (40) |
| Toolbar / preview header | `h-14` (56) |
| App header (fixed) | `h-[65px]` (64 + 1px border) — konstanta terdokumentasi |
| Sidebar width | expanded `16rem` · icon `3rem` · mobile `18rem` |
| Modal (Dialog) width | `max-w-lg` (32rem) |
| Drawer (Sheet) width | mengikuti `side` (default konten `p-6`, lebar responsif) |
| Form/auth container | `max-w-md` (28rem) |
| Preview aspect box | `max-w-sm` (24rem) |

Skala ukuran interaktif: `sm | default | lg` (+ `icon` untuk button). Selaras Density (2C.4).

## 2C.3 Responsive Rules

Breakpoint Tailwind: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. (Memperluas R10 & 2B.20.)

| Aspek | Perilaku |
|-------|----------|
| Layout Changes | Padding konten `p-4` → `lg:p-6`; panel auth `p-10` → `xl:p-14`. |
| Sidebar Behavior | ≥`md`: sidebar icon-collapsible (shortcut Ctrl/Cmd+B). <`md`: berubah jadi **Sheet drawer** (off-canvas, side kiri). |
| Grid Behavior | Mobile 1 kolom → `md:grid-cols-2/3`; `gap-4`. |
| Table Behavior | Bungkus `overflow-x-auto` pada layar kecil; pertahankan lebar minimum kolom (tanpa memaksa wrap). |
| Modal Behavior | Desktop: `max-w-lg` center; mobile: lebar penuh dengan margin (default `DialogContent`). |
| Drawer Behavior | Nav mobile = Sheet side kiri; panel kontekstual boleh side kanan/bawah. |
| Navigation Behavior | Crumb antara `hidden md:block`; label nav disembunyikan saat sidebar collapse (tooltip label). |

## 2C.4 Density Rules

Filosofi: **Compact Enterprise UI**. Dua mode (memperluas 2B.21):

| Aspek | Compact (default) | Comfortable (dicadangkan) |
|-------|-------------------|---------------------------|
| Component height | `h-9` (36) | `h-10` (40) |
| Padding (surface) | `p-4` | `p-6` |
| Gap | `gap-2` (kontrol) | `gap-3` |
| Table row height | head `h-10`, cell `p-2` | cell `py-2.5` |
| Toolbar height | `h-14` | `h-16` |
| Form spacing | `space-y-5` / item `space-y-2` | `space-y-6` / item `space-y-2.5` |

Default sistem = **Compact**. Mode **Comfortable** terdokumentasi tetapi **belum aktif**
(implementasi switch berbasis token = Proposal **P4**, pending — lihat `DESIGN_SYSTEM_PROPOSAL.md`).

## 2C.5 Interaction Rules

Konsolidasi (merujuk aturan yang ada + menambah Cursor & Click Feedback):

| Aspek | Standar |
|-------|---------|
| Hover | Varian bawaan (R12). |
| Focus Ring | `focus-visible:ring-1 ring-ring outline-none` (R11); offset dari surface bila perlu. |
| Transition | Hanya properti spesifik (`transition-colors`/`opacity`/`transform`); **dilarang `transition: all`** (R18). |
| Cursor | Aksi klik → `cursor-pointer` (bawaan Button); teks/nonaktif → default; disabled → `pointer-events-none` (bukan `cursor-not-allowed`). |
| Disabled Interaction | `disabled:opacity-50 disabled:pointer-events-none` (R14). |
| Click Feedback | Perubahan warna varian saat active; hasil aksi async → `sonner`/`Alert` (R24), bukan animasi berlebihan. |
| Keyboard Navigation | Tab/Shift+Tab; Enter submit; Esc menutup overlay; focus-trap + kembalikan fokus ke pemicu; Ctrl/Cmd+B sidebar (R23). |

## 2C.6 Form Rules

Standar wajib semua form (memperluas R15/R22; jarak lihat 2B.7):

- **Label Position:** di atas kontrol (`FormLabel`), rata kiri. `text-sm font-medium`.
- **Required Indicator:** asterisk `*` `text-destructive` setelah label.
- **Optional Field:** akhiri label dengan `(optional)` `text-muted-foreground`.
- **Helper Text:** `text-xs text-muted-foreground` di bawah field.
- **Validation Message:** via `FormMessage` `text-destructive text-xs` + `aria-invalid` (R15).
- **Error Message (global):** `Alert` variant `destructive` di atas form.
- **Success Message:** `Alert` non-destructive / teks konfirmasi ringkas (pola reset sukses).
- **Field Spacing:** `<form>` `space-y-5`; `FormItem` `space-y-2` (2B.7).
- **Grouping:** field terkait dikelompokkan dengan judul seksi (`text-sm font-medium`) + `Separator`; gunakan semantik `fieldset` bila relevan.

## 2C.7 Table Rules

Standar Data Table (memperluas pattern "Data Table" & 2B.9):

- **Header:** `TableHead h-10 px-2 font-medium text-muted-foreground`.
- **Toolbar:** bar di atas tabel — `flex items-center justify-between gap-2` (kiri: search/filter; kanan: actions).
- **Filter:** via `Select`/`DropdownMenu` di toolbar.
- **Search:** `Input` dengan ikon leading, placeholder `Search...`.
- **Sorting:** header dapat diklik + ikon chevron; set `aria-sort`.
- **Pagination:** komponen `Pagination` di bawah, rata kanan; page-size opsional.
- **Row Selection:** kolom `Checkbox` di depan + select-all di header.
- **Empty State:** `No Data Available` — cell `colSpan` `h-24 text-center` (R26).
- **Loading State:** baris `Skeleton` atau `Spinner`.
- **Alignment:** angka `text-right`; teks `text-left`; status/badge kiri; actions `text-right`.
- **Actions Column:** kolom terakhir, `text-right`, ghost icon button (mis. Eye/Edit/Delete) + `aria-label`.

## 2C.8 Icon Rules

Satu standar (memperluas R09 & 2B.18):

- **Icon Library:** **lucide-react** (satu-satunya). Emoji/SVG kustom/library lain dilarang.
- **Icon Size:** default `h-4 w-4` (16); skala 14/16/20/24 mengikuti ukuran kontrol.
- **Icon Position:** leading (sebelum teks) default; trailing untuk chevron/eksternal.
- **Icon + Text:** jarak `gap-2` (induk), rata tengah vertikal.
- **Icon Only Button:** `size="icon"` (`h-9 w-9`/`h-8 w-8`) + **wajib `aria-label`**.
- **Decorative Icon:** `aria-hidden="true"`.
- **Functional Icon:** menyampaikan makna/aksi → wajib punya nama aksesibel (aria-label / teks berdampingan).

## 2C.9 Content Rules

Konten UI **generik** (memperluas R25/R27/R31; ukuran teks lihat 2A):

| Elemen | Aturan |
|--------|--------|
| Page Title | Sentence case, ringkas (`PageHeader` H1). |
| Section Title | Sentence case, `text-base/sm font-medium`. |
| Button Label | Verb-first, sentence case ("Sign in", "Send reset link"). |
| Placeholder | Generik (`name@example.com`, `Search...`) — R25. |
| Empty State | `No Data Available` (R26). |
| Dialog | Title = aksi/pertanyaan; description 1 baris. |
| Tooltip | Singkat, tanpa tanda baca akhir. |
| Toast | Title + deskripsi opsional; ringkas. |
| Validation Message | Spesifik & solutif ("Please enter a valid email address."). |
| Error Message | Jelas, non-teknis, generik. |

## 2C.10 Naming Convention

| Aspek | Standar |
|-------|---------|
| Component | `PascalCase`, **named export** (`export const X`). |
| Page | `PascalCase`, **default export**. |
| Folder | Berkelompok: `components/ui`, `components/layout`, `components/auth`, `pages/*`, `config`. |
| File | Komponen/Page `PascalCase.jsx`; primitive shadcn `kebab-case.jsx` (konvensi upstream). |
| Props | `camelCase`; boolean positif (`isOpen`); handler `onX`. |
| CSS Variables | `--kebab-case`, berprefiks makna (`--sidebar-*`, `--chart-*`). |
| Design Tokens | HSL; tier token = Proposal P1 (pending). |
| Variant | string lowercase (`default`, `secondary`, `outline`, `ghost`, `destructive`, `link`). |
| Size | `sm | default | lg` (+ `icon`) — selaras 2C.2. |
| Icon | import lucide `PascalCase`; `data-testid` kebab-case (deskriptif fungsi). |

## 2C.11 Composition Rules

Urutan komposisi kanonik (jangan mengarang urutan lain; hanya anak terdokumentasi):

- **Card:** `Card > CardHeader(CardTitle[, CardDescription]) > CardContent [> CardFooter]` (`p-6`).
- **Form:** `Form > FormField > FormItem(FormLabel, FormControl, [helper], FormMessage) …> Button submit` (`space-y-5`).
- **Dialog:** `Dialog > (DialogTrigger) + DialogContent(DialogHeader(DialogTitle, DialogDescription), body, [DialogFooter])`.
- **Toolbar:** `flex items-center justify-between gap-2` (kiri: search/filter; kanan: actions).
- **Table:** `[Toolbar] + div.rounded-md.border > Table(TableHeader>TableRow>TableHead ; TableBody>TableRow>TableCell) + [Pagination]`.
- **Sidebar:** `Sidebar > SidebarHeader(brand) + SidebarContent(SidebarGroup>SidebarGroupLabel+SidebarMenu…) + SidebarFooter(user) + SidebarRail`.

## 2C.12 Page Template Registry

**Semua halaman WAJIB memiliki Page Specification** (mengikuti format `LOGIN_PAGE_SPEC.md`).
Struktur standar tiap spec: **Tujuan · Route · Layout (AppLayout/AuthLayout) · Struktur
(PageHeader + sections) · Komponen dipakai (rujuk registry) · State (loading/empty/error)
· Data/Props · Responsive · Aksesibilitas · Konten (generik)**.

| Template | Status |
|----------|--------|
| Login | ✅ (spec ada: `LOGIN_PAGE_SPEC.md`) |
| Dashboard | ⚪ Deferred (menunggu fondasi matang) |
| Master Data (list/table) | ⚪ Deferred |
| Detail | ⚪ Deferred |
| Form (create/edit) | ⚪ Deferred |
| Settings | ⚪ Deferred |
| Profile | ⚪ Deferred |
| Error Page (404/500) | ⚪ Deferred |

Belum perlu membuat semua halaman — cukup standar & struktur dokumentasi ini. **Halaman
baru → buat Page Specification lebih dulu**, lalu implementasi. **Template acuan:
`PAGE_SPEC_TEMPLATE.md`** (wajib disalin untuk setiap spec baru).

> **Roadmap (revisi):** pembuatan Page Specification konkret **DITUNDA** hingga fondasi
> matang. Urutan prioritas pengembangan:
> **1) Foundation → 2) Component Registry → 3) Base Components → 4) Composite Components →
> 5) Sample Blocks → 6) Layout Patterns → 7) `PAGE_SPEC_TEMPLATE.md` (selesai) →
> 8) Page Specifications.** Alasan: agar setiap spec memakai komponen & pola yang sudah
> distandarkan, sehingga tidak perlu revisi berulang saat Design System berubah.

## 2C.13 Registry Audit (Single Source of Truth)

- **Temuan & perbaikan:** baris `card` sebelumnya terdaftar **dua kali** di 1.1 → **disatukan** menjadi satu baris (SSOT).
- **Aturan:** setiap primitive/pattern **hanya satu baris** di registry. Sebelum menambah, **cek keberadaan**; jangan membuat entri ganda. Daftar ⚪ (available) dan baris ✅ tidak boleh memuat komponen yang sama.

---


# BAGIAN 3 — PENDING / BUTUH KEPUTUSAN

Item yang ditunda dipindahkan ke **`BACKLOG.md`** (parkir resmi). Ringkasan:

| ID | Item | Status | Keterangan |
|----|------|--------|------------|
| ~~P1~~ | Alert form-level | ✅ Done | Diaktifkan di `LoginForm` (variant `destructive`). |
| ~~P2~~ | Message Scroller | ✅ Done | Diport versi **styled** tanpa engine `@shadcn/react` (Update 25). **Base Components kini 61/61 Established.** |
| B1 | Dark mode toggle | 🔒 Deferred | Fokus Light Mode dulu → lihat `BACKLOG.md`. |
| B2 | Empty State pattern | ✅ Done | Composite **Placeholder** (`Empty`) di halaman Composite Component (Update 25). |

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
| Awal | Seed registry dari halaman **Login**: 8 primitives ✅ (button, input, label, card, checkbox, separator, form, sonner), 6 patterns ✅ (AuthLayout, LoginForm, Brand lockup, Password+toggle, Loading button, Grid decoration), 32 aturan global (R01–R32). |
| Update 1 | **Alert form-level ✅** diaktifkan di `LoginForm` (variant `destructive`, mock auth: `user@example.com` / `password`). `alert` → ✅ di primitives; pattern "Form-level error alert" ditambahkan. Item ditunda (Dark mode, Empty State) dipindah ke `BACKLOG.md`. |
| Update 2 | **Foundations ditetapkan:** Font **Geist** (primary) + fallback `Inter, system-ui, sans-serif` (R04); Ikon **wajib `lucide-react`** (R09). Font diperbarui di `index.css`. |
| Update 3 | **Dashboard shell** ditambahkan: primitives ✅ scroll-area, sheet, breadcrumb, avatar; patterns ✅ AppLayout, AppSidebar, PageHeader. Navigasi terpusat di `src/config/navigation.js` (menu: Dashboard, Components, Blocks, Charts). Rute `/dashboard/*` di `App.js`; login sukses → redirect `/dashboard`. Halaman utama & sub-halaman sengaja **kosong** dulu. |
| Update 4 | **Sidebar resmi shadcn (sidebar-07) ditambahkan ke design system.** Primitive `ui/sidebar.jsx` (diport TSX→JSX, Tailwind v3, `@radix-ui/react-slot`) + hook `hooks/use-mobile.js` + token `--sidebar-*` di `index.css` (dinetralkan ke monochrome) & mapping `colors.sidebar` di `tailwind.config.js`. Primitives ✅ dropdown-menu, tooltip, skeleton mulai dipakai. `AppLayout`/`AppSidebar` di-refactor memakai Sidebar system (collapse-to-icon, keyboard `Ctrl/Cmd+B`, user dropdown → Log out ke `/login`). |
| Update 5 | **Struktur menu bergrup + submenu collapsible.** `navigation.js` kini `navSections` (grup: Greetings, Design System) dengan item bercabang (`children`); primitive ✅ collapsible dipakai untuk Sample Blocks & Sample Charts. Dashboard dipindah ke `/`; rute `/design-system/{components, blocks/*, charts/*}` (semua **blank**) via `PlaceholderPage` reusable (judul dari nav config). Breadcrumb kini menampilkan trail bertingkat. Login sukses → redirect `/`. |
| Update 6 | **Kustomisasi sidebar-07** (styling, tanpa primitive baru): (a) header sidebar pakai `border-b border-sidebar-border` + `sticky top-0 bg-sidebar`, dan header konten dinaikkan ke `h-16` (64px) agar garis bawah keduanya **sejajar presisi** membentuk satu garis menerus (referensi sidebar-12); (b) blok user footer dibuat "timbul" (`bg-sidebar-accent` + border + `shadow-sm`) menyerupai state hover. |
| Update 7 | **App-shell fixed header + presisi 1px.** Layout dikunci `h-svh`; hanya area konten (`overflow-y-auto`) yang scroll → header & sidebar benar-benar diam. Header konten `h-[65px]` untuk menyamai tinggi header sidebar (auto 64px + 1px border) → garis benar-benar sejajar. |
| Update 8 | **Sample Charts diisi konten.** Ditambahkan primitive resmi ✅ `chart` (`ui/chart.jsx`, diport TSX→JSX) + **recharts di-pin ke `2.15.4`** (versi yang didukung shadcn; recharts 3.x menyebabkan `width(-1)` & render parsial). Pattern ✅ `ChartCard`; data contoh generik di `config/chartSampleData.js`. 7 halaman chart (Area/Bar/Line/Pie/Radar/Radial/Tooltips) via Recharts. Catatan: (a) container pie/radar/radial pakai `aspect-square w-full max-w-[320px]` agar tak kolaps; (b) RadialBar diberi warna per-slice via `<Cell>`; (c) `<Bar>` diberi `isAnimationActive={false}` karena React StrictMode membuat animasi bar tersangkut di tinggi 0; (d) elemen chart harus anak langsung `ChartContainer` (jangan dibungkus komponen). Dashboard `/` diisi blok placeholder (`bg-muted/50`) yang cukup tinggi untuk uji scroll. |
| Update 9 | **Aturan diformalkan.** Ditambahkan **R33 Charts**, **R34 App Shell & Scroll**, **R35 Navigation**, **R36 Routing**, **R37 Dependency Exception**; R05 diperluas (token `--sidebar-*` & `--chart-1..5`); R26 mencatat placeholder surface `bg-muted/50`. Governance (`DESIGN_SYSTEM_RULES.md`) memuat daftar library yang diizinkan (lucide-react, recharts). |
| Update 10 | **Sample Blocks lengkap.** (a) `SidebarBlockPage` di-wire ke rute `/design-system/blocks/sidebar` dan dibuat **self-contained/inert**: sidebar preview dibangun langsung dari primitive shadcn + struktur `navSections`, memakai `SidebarMenuButton onClick` (bukan `<Link>`) sehingga **klik menu tidak pernah navigate ke URL host** — hanya memperbarui seleksi lokal (breadcrumb) & menampilkan placeholder kosong (`bg-muted/50`). (b) Pattern ✅ **ForgotPasswordForm** + halaman standalone `/forgot-password` (reuse `AuthLayout`; schema `resetSchema` di `authSchema.js`; sukses → Alert non-destructive). Link "Forgot password?" di `LoginForm` kini navigate ke `/forgot-password`. (c) Pattern ✅ **Block Preview via iframe**: `LoginBlockPage` & `ForgotBlockPage` merender rute nyata (`/login`, `/forgot-password`) di dalam `<iframe>` berbingkai `h-[680px]`. |
| Update 11 | **Typografi diformalkan + halaman Components dikembalikan blank.** (a) Ditambahkan **BAGIAN 2A — Typography Scale** (tabel resmi H1→terkecil: `text-2xl/3xl/4xl` heading, `text-sm/base` body, `text-xs` terkecil; weight 400/500/600; aturan `leading-tight/normal/relaxed` & `tracking-tight` khusus heading); **R04** diperbarui untuk merujuk skala ini. (b) **ComponentsPage dihapus** — rute `/design-system/components` dikembalikan ke `PlaceholderPage` (blank) karena pengisian sebelumnya tidak diinstruksikan user. |
| Update 12 | **Halaman Components mulai diisi (atas instruksi user).** Primitive ✅ **table** diaktifkan. Pattern ✅ **Data Table (card-wrapped)**: `Table` shadcn dibungkus `Card`. Kolom awal: **No** (urut), **Name** (daftar **All Components** shadcn/ui — 63 item, sumber `ui.shadcn.com/docs/components`), **Action** (`text-right`, tombol ghost icon **Eye/preview** dgn `aria-label` + toast placeholder). Tetap ada fallback empty-state R26 (`No Data Available`). Rute `/design-system/components` kembali ke `ComponentsPage`. |
| Update 13 | **Kolom Status ditambahkan di tabel Components.** Tiap komponen shadcn dipetakan ke legenda design system via Badge: **Established** (`default`, sudah dipakai), **Available** (`secondary`, tersedia di `ui/`, belum dipakai), **Pending** (`outline`, belum diport ke `ui/` — mis. Attachment/Bubble/Combobox/Data Table/Date Picker/Field/Spinner/Typography). Primitive ✅ **badge** diaktifkan (dipakai untuk status). |
| Update 14 | **Tombol Eye → Preview Dialog nyata (mulai komponen awalan "A").** Pattern ✅ **Component Preview Dialog**: klik Eye membuka `Dialog` berisi judul (nama + Badge status) & **preview live** dari `config/componentPreviews.jsx`. Diimplementasi untuk **Accordion, Alert, Alert Dialog, Aspect Ratio, Avatar** (konten placeholder generik); **Attachment** (pending) menampilkan pesan "not yet available". Primitive ✅ diaktifkan: **dialog, accordion, alert-dialog, aspect-ratio**; status baris tabel untuk komponen ini diperbarui ke Established. Komponen lain (non-A) membuka dialog dengan fallback "Preview not implemented yet". |
| Update 15 | **Spacing System diformalkan.** Ditambahkan **BAGIAN 2B — Spacing System** (26 poin: Spacing Scale, Margin, Padding, Gap, Section, Component, Form, Card, Table, Modal, Drawer, Sidebar, Header/Toolbar, List Item, Navigation, Button, Input, Icon, Content Width & Container Padding, Responsive, Density, Do's & Don'ts + tambahan Chart/Empty-state/Overlay Offset/Separator). Semua nilai diturunkan dari penggunaan nyata (mis. root `space-y-6`, form `space-y-5`, Card/Dialog/Sheet `p-6`, tabel `h-10 px-2`/`p-2`, button `h-9 px-4 py-2 gap-2`, input `h-9 px-3 py-1`, sidebar `16rem/3rem/18rem`). **R03** diperbarui merujuk skala ini. |
| Update 16 | **Menu "Components" jadi grup + submenu.** `navigation.js`: item **Components** kini collapsible dgn children **Base Components** (`/design-system/components/base`) & **Composite Component** (`/design-system/components/composite`). Base = halaman tabel shadcn (judul → "Base Components"); Composite = `PlaceholderPage` (blank, menunggu konten). Rute lama `/design-system/components` → redirect ke `/base`. Sidebar preview & breadcrumb otomatis mengikuti (bersumber dari `navSections`). |
| Update 17 | **Audit konsistensi Typography (2A) & Spacing (2B) pada halaman existing.** Diperiksa: Login, Dashboard, Base Components, Sample Blocks (semua), Sample Charts (semua). Deviasi diperbaiki: (a) `AuthLayout` list item `gap-3.5` (off-scale) → `gap-3`; (b) `tickMargin` diseragamkan ke **8** (Bar & Tooltips sebelumnya 10) agar konsisten dgn area/line & rule Chart Spacing; (c) `ChartCard` `CardTitle` → `text-base` (eksplisit H3 sesuai 2A, selaras `ComponentsPage`). Sisanya sudah patuh (root `space-y-6`, grid `gap-4`, Card `p-6`, form `space-y-5`, PageHeader H1 `text-2xl`). Dashboard tetap `flex gap-4` (blok demo, nilai on-scale). |
| Update 18 | **Audit Improvement — registri & aturan baru (BAGIAN 2C).** Ditambahkan (tanpa mengubah aturan lama): **2C.1 State Registry**, **2C.2 Size System (SSOT dimensi)**, **2C.3 Responsive Rules**, **2C.4 Density Rules** (Compact default / Comfortable dicadangkan), **2C.5 Interaction Rules** (+Cursor, Click Feedback), **2C.6 Form Rules**, **2C.7 Table Rules**, **2C.8 Icon Rules**, **2C.9 Content Rules**, **2C.10 Naming Convention**, **2C.11 Composition Rules**, **2C.12 Page Template Registry**, **2C.13 Registry Audit**. Sub-bagian merujuk R11–R16/R09/R25/R31 & 2A/2B untuk hindari duplikasi. **Dedup:** baris `card` yang terdaftar dua kali di 1.1 disatukan (SSOT). |
| Update 19 | **Page Specification: template + 2 spec turunan.** Dibuat `PAGE_SPEC_TEMPLATE.md` (acuan wajib, struktur: Informasi Halaman, Tujuan, Layout, Component Registry, Component Composition, User Interaction Flow, Responsive, Accessibility, States, Empty/Loading/Error, Permissions opsional, Notes, Changelog — semua generic). Ditambah `DASHBOARD_PAGE_SPEC.md` & `MASTER_DATA_PAGE_SPEC.md` (🔵 Proposed, UI/struktur saja, tanpa konteks bisnis). Registry 2C.12 diperbarui (Login/Dashboard/Master Data = ✅ ada spec) + rujukan template. |
| Update 20 | **Koreksi Roadmap — Page Specification ditunda.** `DASHBOARD_PAGE_SPEC.md` & `MASTER_DATA_PAGE_SPEC.md` **dihapus** (dibuat terlalu dini). `PAGE_SPEC_TEMPLATE.md` dipertahankan sebagai **template dokumentasi generic** (struktur diselaraskan: "User Interaction Flow"→**User Flow**, bagian **Permissions dihapus**; bagian akhir: Notes, Changelog). 2C.12 diperbarui: semua Page Spec konkret → ⚪ Deferred + urutan roadmap resmi (Foundation → Registry → Base → Composite → Sample Blocks → Layout Patterns → Template → Page Specs). Fokus dev berikutnya: menuntaskan Base & Composite Components, Sample Blocks reusable, Layout Patterns. |
| Update 21 | **Base Components — preview huruf B.** Ditambah preview live di `config/componentPreviews.jsx` untuk **Badge** (4 varian), **Breadcrumb** (trail generic Application Name › Feature One › Current Page), **Button** (6 varian + ukuran sm/default/lg/icon/disabled). **Bubble** & **Button Group** = pending → dialog menampilkan "not yet available". Diverifikasi via 5 assertion Playwright (PASS). |
| Update 22 | **Base Components — SEMUA preview selesai.** `config/componentPreviews.jsx` kini memuat preview live untuk **seluruh 45 komponen non-pending** (A–Z), termasuk yang kompleks: Calendar, Chart (recharts), Carousel, Command, Resizable, Sidebar (mini), Menubar, Navigation Menu, Select, Dialog/Sheet/Drawer (nested), Input OTP, dll. Semua status **Available → Established** (karena kini didemokan). 18 komponen **pending** (Attachment, Bubble, Button Group, Combobox, Data Table, Date Picker, Empty, Field, Input Group, Item, Kbd, Marker, Message, Message Scroller, Native Select, Spinner, Typography) menampilkan "not yet available". **Diverifikasi testing_agent (frontend 100%)**: 29 preview berisiko-tinggi render tanpa error runtime, 3 pending fallback benar, tabel tetap berfungsi setelah buka/tutup beruntun. |
| Update 23 | **12 komponen "pending" diport → Established.** Ditambah primitive JSX baru: `spinner, kbd, empty, button-group, input-group, field, item, native-select, typography` (+ preview live), serta 3 komposisi stateful di `components/previews/AdvancedPreviews.jsx`: **Combobox** (Popover+Command), **Date Picker** (Popover+Calendar), **Data Table** (dependency baru **`@tanstack/react-table@8.21.3`**). Semua 12 kini Established dgn preview. **Tetap Pending (6, sesuai keputusan):** chat/AI kit `Attachment, Bubble, Marker, Message, Message Scroller` (di luar scope enterprise). Perbaikan minor: Date Picker auto-close saat pilih tanggal; teks fallback dialog dikonsolidasi jadi satu ("...not yet available..."). **Diverifikasi testing_agent (frontend 100%, 0 console error).** |
| Update 24 | **`Direction` dihapus total + 3 komponen chat diport → Established.** (a) Komponen **`Direction` (RTL)** dihapus tuntas dari kode & seluruh dokumentasi (atas perintah user). (b) Diport primitive JSX baru presentational (100% Tailwind + cva, pola `message.jsx`): **`attachment.jsx`** (Attachment/Media/Content/Title/Description/Actions/Action/Trigger/Group; state idle→done, 3 size, orientation, shimmer via `animate-pulse`), **`bubble.jsx`** (7 varian via cva + align start/end, BubbleGroup, BubbleContent context, BubbleReactions), **`marker.jsx`** (varian default/border/separator + MarkerIcon/MarkerContent). Ketiganya + **Message** (diport lebih dulu) kini **Established** dgn preview live di `componentPreviews.jsx`. (c) **Tetap Pending (1):** `Message Scroller` — bukan primitive styling, melainkan **engine headless streaming `@shadcn/react`** (MessageScrollerProvider + hooks imperatif untuk anchoring/auto-scroll/prepend). Menunggu keputusan user untuk menambah dependency berat tsb. **Base Components: 60/61 Established.** Diverifikasi via screenshot (3 preview render, 0 error). |
| Update 25 | **Message Scroller diport (versi styled) + submenu Composite Component diisi 15 komponen.** (a) **`message-scroller.jsx`** dibuat sebagai versi *styled sederhana tanpa engine `@shadcn/react`* (Context lokal: viewportRef + auto-scroll-to-bottom saat di dasar + tombol "jump to latest" muncul saat scroll ke atas). Parts: MessageScroller/Viewport/Content/Item/Button. Status → **Established** dgn preview live. **Base Components: 61/61 Established (tuntas).** (b) **Submenu "Composite Component"** (sebelumnya PlaceholderPage) kini halaman tabel `CompositeComponentsPage.jsx` (kolom: No, Name, **Dependency**, Status, Action/Eye→Dialog) + config `config/compositePreviews.jsx`. Berisi **15 composite** (semua Established, generik, monochrome): **Tanpa dep (9):** Autocomplete (Command+Popover), Rating, Stepper, List (Item), Cookie Banner, Preloader (Spinner+Skeleton), Widget (Card+Badge), Placeholder (Empty), Data Grid (`@tanstack/react-table` — sudah ada). **Dengan dep baru (6):** Code Block (`react-syntax-highlighter`, Prism oneLight), Markdown (`react-markdown`+`remark-gfm`), Phone Input (`react-phone-number-input`), Input Mask (`react-imask`), Kanban (`@dnd-kit/core`+`sortable`+`utilities`, multi-kolom drag), Sortable (`@dnd-kit/sortable`, reorder vertikal). Semua composite disimpan di `src/components/composite/`. **R37 (Dependency Exception) diperluas** untuk mengizinkan lib di atas. Compile sukses (0 error webpack). *Catatan: verifikasi visual screenshot tertunda karena gangguan tool platform; kode ter-compile bersih.* |
| Update 26 | **Sinkronisasi Governance (siap review).** Registry & aturan diselaraskan penuh dgn kode: (a) **1.1 Primitives** diperbarui → semua ✅ (tambah baris: chat kit `attachment/bubble/marker/message`, `message-scroller` styled, serta `spinner/kbd/empty/button-group/input-group/field/item/native-select/typography`), ditandai **61/61 Established**. (b) **1.2** ditambah pattern **Composite Components Table + Dialog**. (c) **Baru: 1.4 Composite Components** — tabel 15 composite (base penyusun + dependency + file). (d) **R37** diperluas + aturan "dependency terikat komponen, tidak boleh menyebar". (e) **Bagian 3 Pending** dimutakhirkan: Message Scroller ✅ Done, Empty State pattern ✅ Done (composite Placeholder). (f) `DESIGN_SYSTEM_RULES.md` disinkronkan (Bagian 1 pengecualian dependency + Bagian 5 inventaris 61 primitive + daftar composite). Semua verifikasi visual composite (15/15) render 0-error. |
| Update 27 | **Menu "Components" digabung (single) + menu baru "Sample Layout".** (a) **Navigasi:** item **Components** diubah dari grup collapsible menjadi **item tunggal** → route `/design-system/components`. Route lama `/base` & `/composite` kini **redirect** ke `/components`. (b) **Halaman Components gabungan:** `ComponentsPage.jsx` kini menggabungkan **Base (62) + Composite (15) = 77** komponen, diurut **A–Z** (`localeCompare`), dengan kolom baru **Type** (Base/Composite Badge). Preview di-resolve per-`kind` (`componentPreviews` vs `compositePreviews`); `CompositeComponentsPage.jsx` menjadi tidak terpakai (tak dirute) tetapi `config/compositePreviews.jsx` tetap dipakai. (c) **Menu baru "Sample Layout" (grup, ikon `LayoutTemplate`)** dgn 3 halaman di `pages/layouts/`: **DataTable** (`DataTableLayoutPage.jsx` — tanstack: toolbar search + Columns visibility + Add, row-selection, sortable, status Badge, row actions DropdownMenu, pagination), **Form Elements** (`FormElementsPage.jsx` — galeri semua elemen form dalam grid Card), **Form Layout** (`FormLayoutPage.jsx` — form rhf+zod bersection, 2-kolom, Save/Cancel). Route `/design-system/layouts/{datatable, form-elements, form-layout}`. 1.2 Patterns ditambah 3 baris. **Diverifikasi via screenshot:** merged 77 baris A–Z + preview Composite (Kanban) resolve benar; 3 halaman render; validasi Form Layout jalan (4 pesan error). 0 console error. |
