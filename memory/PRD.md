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
