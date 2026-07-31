# PRD — UI Guidelines / Design System Template

## Problem Statement
Membangun template **UI Guidelines / Design System** generik sebagai fondasi aplikasi enterprise masa depan.
- 100% komponen resmi shadcn/ui (tidak ada primitive custom kecuali disetujui).
- Placeholder generik ("Application Name", "Feature One"), TANPA logika bisnis spesifik.
- Gaya visual monochrome-first, minimal, modern enterprise.
- Font: Geist (primary). Ikon: lucide-react saja.
- Reusable patterns, compact design (grid 4px), design tokens (HSL).

**Bahasa komunikasi: Indonesia (Bahasa Indonesia).**

## Arsitektur (Frontend-only)
- `/app/frontend/docs/DESIGN_SYSTEM.md` & `DESIGN_SYSTEM_RULES.md` — SSOT aturan UI (termasuk R38).
- `src/components/composite/` — PasswordInput, Autocomplete, Kanban, DataGrid, CodeBlock, dll.
- `src/components/ui/` — Shadcn primitives (dimodifikasi untuk compact UI).
- `src/config/` — navigation.js, componentPreviews.jsx, compositePreviews.jsx.
- `src/pages/layouts/` — DataTableLayoutPage, FormElementsPage, FormLayoutPage.
- `src/pages/ComponentsPage.jsx` — data table gabungan Base + Composite (A-Z).

## Rule Kunci
- **R38**: Modifikasi primitive/composite harus jaga compact spacing (`px-6 py-4`), grid 4px, token monochrome (`border-border`), typography tepat. Verifikasi semua consumer via screenshot sebelum selesai.

## Sudah Diimplementasikan
- (2026-06) **Reusable `DialogBody` + fix dialog form berantakan** [MINOR]: `DialogContent` `p-0` → body form wajib padding sendiri; sebelumnya RolesPage lupa `px-6` (pakai `py-2`) → form melenceng. Ditambah `DialogBody` (`px-6 py-4` + `space-y-[var(--field-gap)]`) di `ui/dialog.jsx` & dipakai di semua form dialog (Offices, Roles, DataTable, FormElements). Aturan dicatat (2B.10, 2C.11, registry, Changelog Update 71). Diverifikasi screenshot + create role via UI.
- (2026-06) **Modul Roles/Jabatan (CMS, pohon parent_id)** [P0]: backend FastAPI `roles` (id, name unique, parent_id nullable, timestamps) — 1 atasan langsung, rantai atasan dihitung dari parent_id; CRUD + bulk-delete; nama unik (409), anti-siklus (400), delete mempromosikan anak ke atasan terdekat. Frontend RolesPage gaya DataTable (tree-indent, kolom Direct superior + Superiors chain, red Delete, DensityToggle), dialog pemilih atasan mengecualikan diri+keturunan. Rute `/roles`. Diverifikasi testing agent: backend 12/12 + frontend 100% (iteration_7.json).
- (2026-06) **Offices page mirror Sample DataTable + Delete destructive (red)** [MINOR]: `PageHeader` dihapus; halaman dibungkus `Card` (CardHeader judul "Offices" + tombol Add Office; CardContent: toolbar Search + DensityToggle, tabel, footer) meniru `DataTableLayoutPage`. `DensityToggle` di-restyle jadi dropdown "Density" (outline sm, Rows3+chevron, radio Dense/Comfortable) seperti sample. Row-action Delete + tombol konfirmasi AlertDialog (single+bulk) kini merah/destructive. Diverifikasi testing agent: backend 19/19 + frontend 100%, 0 bug (iteration_6.json); guard clean. CRUD Offices solid.
- (2026-06) **Density runtime toggle (Dense ⇄ Comfortable) + Offices layout tweak + tabel no-wrap** [MINOR]: density kini runtime-switchable via CSS var (`--ctl-h`/`--field-gap`/`--item-gap`) yang di-remap `:root[data-density="comfortable"]`; `DensityProvider` (localStorage `ui-density`, default dense) + `DensityToggle` (Rows3/Rows2) — primitives & form field-stack pakai var. Offices: tombol **Add Office** dipindah ke `PageHeader` (box judul), **DensityToggle** ditaruh di toolbar. Tabel Offices `whitespace-nowrap` + Address tanpa truncation → teks penuh, scroll-x. Changelog Update 69; guard clean; diverifikasi screenshot Dense vs Comfortable.
- (2026-06) **Density default → DENSE (h-8 + space-y-3), global** [MINOR]: atas permintaan user (dialog Offices terasa longgar untuk UI Compact). Primitives `ui/` diubah — tinggi kontrol `h-9`→`h-8` (input/select/native-select/button: default `h-8`, sm `h-7`, lg `h-9`, icon `h-8 w-8`), `FormItem` `space-y-2`→`space-y-1.5`. Konsumen form field-stack `space-y-4/5`→`space-y-3` (OfficesPage dialog, FormElementsPage, DataTableLayoutPage, FormLayoutPage, Profile/Wizard blocks). Card umum/non-form tetap `space-y-4`. Docs/SSOT disinkronkan (1.1, 2B.5/7/8/10/16/17/21, 2C.2/4/6/8/11/14, RULES §7/9/10) + Changelog Update 68. Guard clean; diverifikasi screenshot Offices dialog + Form Elements. Konsisten lintas area Application & Design System.
- (2026-06) **CMS modul Offices (FastAPI + MongoDB, CRUD nyata)**: endpoint `/api/offices` (CRUD + bulk-delete), unique code&name (app + MongoDB index), validasi lat/long/radius. Frontend `OfficesPage` pola DataTable design system (search/sort/select/bulk-delete/pagination), OfficeFormDialog (zod, 409 inline), EmptyState states. Testing agent: backend 18/18 + frontend 100%, 0 bug. Modul konsumen pertama design system. Changelog Update 67.
- (2026-06) **CMS scope awal (placeholder)**: area Application → grup Management dengan **Users** (`/users`), **Roles** (`/roles`), **Offices** (`/offices`) memakai `PlaceholderPage`. Menunggu struktur DB dari user sebelum bangun fungsionalitas. Changelog Update 65.
- (2026-06) **Sidebar Area Switcher (Application / Design System)**: header sidebar jadi dropdown switcher (label tetap "UI Guidelines / Enterprise"); `navAreas` — Application (Dashboard `/`) & Design System (semua `/design-system/*`, tidak ada yang hilang); area aktif diturunkan dari rute; default Application. `navSections` tetap derivatif (SidebarBlock aman). Docs R35/1.2 + Changelog Update 64. Guard clean. Persiapan menuju CMS.
- (2026-06) **Promosi Combobox & Date Picker → composite reusable** (`composite/Combobox.jsx`, `composite/DatePicker.jsx`) dengan props terkontrol; preview lama jadi wrapper tipis; FormElementsPage pakai composite + `options`. Audit reusability tuntas (chart = ChartCard, DataTablePreview = katalog). Docs 1.4/2C.24/Category Index + Changelog Update 63. Guard clean.
- (2026-06) **Maintainability dokumentasi (review ahli, 9 catatan, doc-only)**: Category Index + Template Dokumentasi Komponen + Konvensi Penulisan (1.0), Dependency Registry (2C.24), BACKLOG.md berkolom (alasan/trigger/status), istilah dibakukan (Master Registry), audit penomoran R01–R39 & 2C.1–2C.24 (bersih), contoh Card/Dialog (2C.11). Item forward-looking (Versioning/Testing/Performance) ditandai 🔵 (opsi a). Changelog Update 62.
- (2026-06) **Code-quality & docs (batch A→C)**: `ErrorBoundary` global (fallback `EmptyState error`), `.prettierrc`/`.prettierignore`, **`docs/ARCHITECTURE.md`**, mock data dipindah ke `config/sampleData.js` (dipakai DataTable & DataDisplay), guard mendeteksi `console.log/debug/info`. Database/API docs ditunda ke fase backend. Changelog Update 61.
- (2026-06) **3 pattern governance → komponen nyata**: composite **`EmptyState`** (6 varian, 2C.18) + util **`lib/format.js`** (2C.20) + 3 halaman Sample Blocks — **Empty States**, **Permissions** (Hide/Disable/Read-only/Forbidden, 2C.21), **Data Display** (nilai terformat). Nav + rute + docs (1.2/1.4/2C.18/20/21) disinkronkan. Changelog Update 58. Guard clean.
- (2026-06) **Governance maturity (review ahli, doc-only)**: +9 section di `DESIGN_SYSTEM.md` — 2C.15 Versioning/Release (SemVer), 2C.16 Component Lifecycle (+Experimental/Deprecated/Removed), 2C.17 Feedback Pattern (matriks), 2C.18 Empty State Registry (6 jenis), 2C.19 Search/Filter/Sort, 2C.20 Data Display & Formatting, 2C.21 Permission Pattern, 2C.22 Testing Standard, 2C.23 Performance Guideline. Navigation (#8) dinilai sudah tercakup R35. `DESIGN_SYSTEM_RULES.md` §11 pointer. Changelog Update 57.
- (2026-06) **Audit UI site-wide + sinkron dokumentasi (pra Save-to-GitHub)**: fix `DesignTokensPage` H2 `text-lg`→`text-base` (patuh skala 2A); **DataTable empty-state filter-aware** ("No users match your filters." + tombol Clear filters/`FilterX`) selain generik `No Data Available`. Docs 2C.7 & 1.2 + Changelog Update 56 disinkronkan. Guard clean (exit 0).
- (2026-07-29) **Phone Input dirombak** (pola "Phone Input 1"): country selector Popover+Command (search + bendera/nama/kode), **trigger tampilkan kode negara** (bukan bendera), input format nasional. Diverifikasi screenshot.
- (2026-07-29) **Wizard & Profile dipindah ke Sample Blocks**: submenu baru **Profile** (`/design-system/blocks/profile`, dgn unsaved-changes: Save/Cancel disabled sampai dirty + indikator) & **Wizard** (`/design-system/blocks/wizard`). Form Layout kembali ke 6 form dasar. Diverifikasi screenshot.
- (2026-07-29) **Form Layout diperkaya** (kemudian dipindah): Multi-step Wizard (StepIndicator + validasi per-langkah) & Profile/Settings. `Stepper` composite direfactor → ekstrak `StepIndicator` reusable.
- (2026-07-29) **Hibrida full-width**: Combobox/Date Picker/Input OTP default `w-full` + opt-out lebar tetap (primitive `input-otp.jsx` slot `flex-1`). Diverifikasi 3 konsumen.
- (2026-07-29) **P3 — Design Token 2-layer + Dark Mode**: `index.css` direfaktor jadi 2-layer (Layer 1 primitives `--neutral-*`/`--red-*`/`--hue-chart-*` → Layer 2 semantic via `var()`). `ThemeProvider` (Light/Dark/System, localStorage `ui-theme`, matchMedia) + `ModeToggle` di header. Halaman baru **Design Tokens** (`/design-system/tokens`). Diverifikasi screenshot (light & dark).
- (2026-07-29) FormLayoutPage: tata letak dipisah per ukuran — 3 form kecil (Login, Reset, OTP) di grid `md:grid-cols-2 lg:grid-cols-3`; 3 form besar (Register, Change Password, Contact) di grid `md:grid-cols-2`. Diverifikasi via screenshot.
- 78 komponen (Base + Composite) dalam satu data table A-Z.
- Sample Layout: DataTable, Form Elements, Form Layout.
- Pola Header/Body/Footer pada Card & Dialog (compact `px-6 py-4`).
- `autoComplete="off"` global untuk Input; composite PasswordInput dengan ikon mata.
- Audit spacing global (Command & Empty state dirapatkan).

## Backlog
- P1: Layout Patterns tambahan bila diminta (mis. Dashboard Layout).
- ~~P2: Page Specifications (Dashboard, Master Data)~~ ✅ Dokumen spec selesai (2026-07-29): `DASHBOARD_PAGE_SPEC.md` & `MASTER_DATA_PAGE_SPEC.md` (🔵 Proposed, struktur/UI saja). Implementasi halaman = opsional berikutnya.
- ~~P3: Arsitektur 2-layer Design Token + Dark Mode~~ ✅ Selesai (2026-07-29).

## Kredensial (mock auth)
- Email: `user@example.com` / Password: `password`
