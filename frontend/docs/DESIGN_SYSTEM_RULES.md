# Design System Rules — WAJIB DIPATUHI (Non-Negotiable)

> Dokumen ini adalah kontrak. Setiap UI (komponen, halaman, layout) yang dibuat
> di project **UI Guidelines** ini **HARUS** mengikuti aturan di bawah.
> Aturan ini tidak boleh dilanggar tanpa persetujuan eksplisit dari pemilik project.

---

## 0. Prinsip Utama

1. **Design System adalah satu-satunya sumber kebenaran (single source of truth).**
2. **100% memakai komponen resmi shadcn/ui** yang tersedia di `src/components/ui/`.
3. **Dilarang berimprovisasi.** Jika sesuatu tidak tersedia di design system,
   **JANGAN membuatnya sendiri** — laporkan dulu (lihat Bagian 4).

---

## 1. Aturan Komponen

- ✅ **Gunakan** komponen dari `src/components/ui/` (daftar di Bagian 5).
- ❌ **JANGAN** membuat komponen UI baru bila sudah ada padanannya di shadcn/ui.
- ❌ **JANGAN** memodifikasi struktur/perilaku/gaya bawaan komponen shadcn/ui
  (file di `src/components/ui/`) tanpa persetujuan.
- ❌ **JANGAN** memakai library UI lain (MUI, Ant, Chakra, Bootstrap, Flowbite, dll).
  - ✅ **Pengecualian yang diizinkan** (dependency resmi/pendukung): **lucide-react** (ikon) &
    **recharts@2.15.4** (chart) untuk global; ditambah dependency yang **terikat komponen**
    (mis. Data Grid, Code Block, Markdown, Phone Input, Input Mask, Kanban, Sortable).
    **Daftar lengkap & otoritatif (SSOT) ada di R37** pada `DESIGN_SYSTEM.md` — jangan
    menduplikasi di sini. Di luar daftar itu, library baru **wajib disetujui** dulu, dan
    setiap dependency **tidak boleh menyebar** ke luar komponennya.
- ❌ **JANGAN** memakai elemen HTML mentah untuk hal yang sudah punya komponen
  (mis. `<button>`, `<input>`, `<select>` mentah) — pakai komponen shadcn/ui.
- ✅ Elemen HTML semantik **boleh** dipakai hanya untuk struktur/layout
  (`<main>`, `<aside>`, `<section>`, `<ul>`, `<nav>`, dll), bukan sebagai kontrol UI.

### Yang termasuk "improvisasi" (DILARANG)
- Membuat kontrol UI kustom (dropdown, modal, toast, date picker, tabs, dll) sendiri.
- Menyalin/menempel komponen dari sumber lain lalu mengubah gaya default-nya.
- Menambah warna, font, radius, atau shadow di luar design token.

---

## 2. Aturan Design Token & Styling

- ✅ **Selalu** memakai design token semantik:
  `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`,
  `border-border`, `bg-card`, `bg-secondary`, `bg-accent`, `text-destructive`, dst.
- ❌ **JANGAN** memakai warna hardcode: `text-white`, `bg-white`, `bg-black`,
  `bg-blue-500`, `text-red-600`, kode hex (`#fff`), atau `rgb()/hsl()` literal.
- ✅ Token CSS **wajib** format **HSL space-separated** di `index.css`
  (contoh: `--primary: 0 0% 9%`). Dilarang format RGB.
- ❌ **JANGAN** mengubah nilai token / tema shadcn (`index.css`, `tailwind.config.js`)
  tanpa persetujuan. Tema saat ini = **neutral / monochrome** bawaan shadcn.
- ✅ Warna hanya sebagai **accent** untuk aksi penting / status
  (mis. `destructive` untuk error), **bukan** dekorasi.
- ✅ Spacing, radius, shadow, dan motion mengikuti skala bawaan shadcn/ui.
- ✅ **Font WAJIB: Geist** (primary), fallback `Inter, system-ui, sans-serif`.
  Diatur di `index.css`. Dilarang memakai font lain tanpa persetujuan.
- ✅ **Ikon WAJIB: `lucide-react`** (satu-satunya sumber ikon), ukuran default
  `h-4 w-4`, `aria-hidden` bila dekoratif. ❌ Dilarang emoji, SVG inline kustom,
  atau library ikon lain.

---

## 3. Aturan Visual & Layout

- Gaya target: **Clean, Minimal, Modern, Professional, Enterprise, Monochrome-first,
  Compact.**
- Prioritaskan **konsistensi** dan **data density** — hindari whitespace berlebih
  dan efek visual berlebihan.
- **Semua UI wajib responsif** (mobile & desktop).
- **Accessibility wajib**: label pada input (`Label`/`FormLabel`), `aria-*` untuk
  kontrol ikon, focus state terlihat, kontras memenuhi WCAG AA, HTML semantik.

---

## 4. Prosedur Saat Komponen TIDAK Tersedia (WAJIB)

Jika sebuah kebutuhan **tidak dapat dipenuhi** oleh komponen di Bagian 5:

1. **BERHENTI. Jangan membuat komponen kustom.**
2. **Laporkan** dengan format baku berikut:

   > ⚠️ **KOMPONEN BELUM TERSEDIA DI DESIGN SYSTEM**
   > - Kebutuhan: _(jelaskan komponen/pola yang dibutuhkan)_
   > - Padanan shadcn/ui: _(ada / tidak ada — sebutkan bila ada)_
   > - Rekomendasi: _(opsi solusi resmi, mis. tambahkan komponen shadcn X)_
   > - Menunggu persetujuan sebelum implementasi.

3. **Tunggu keputusan** pemilik project sebelum menambah/membuat apa pun.
4. Jika disetujui: tambahkan komponen **resmi shadcn/ui** (via referensi dokumentasi
   resmi), bukan versi buatan sendiri.

Dokumentasi resmi acuan: https://ui.shadcn.com/docs/components

---

## 5. Inventaris Komponen Design System (Yang Tersedia)

Sumber: `src/components/ui/`. Hanya komponen di bawah ini yang dianggap
"tersedia" di design system:

accordion, alert, alert-dialog, aspect-ratio, attachment, avatar, badge, breadcrumb,
bubble, button, button-group, calendar, card, carousel, chart, checkbox, collapsible,
command, context-menu, dialog, drawer, dropdown-menu, empty, field, form, hover-card,
input, input-group, input-otp, item, kbd, label, marker, menubar, message,
message-scroller, native-select, navigation-menu, pagination, popover, progress,
radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton,
slider, sonner (toast), spinner, switch, table, tabs, textarea, toast, toaster,
toggle, toggle-group, tooltip, typography.

**Base Components: 61/61 Established** — semua primitive punya preview live di halaman
"Base Components".

Ikon: **lucide-react** (diperbolehkan). Dilarang memakai emoji sebagai ikon.

**Composite Components** (`src/components/composite/`, terdaftar di halaman "Composite Component" &
Registry 1.4): Autocomplete, Rating, Stepper, List, Cookie Banner, Preloader, Widget, Placeholder,
Data Grid, Code Block, Markdown, Phone Input, Input Mask, Kanban, Sortable, Empty State,
Combobox, Date Picker, Password Input. Composite =
**komposisi** dari primitives di atas (+ dependency yang diizinkan R37); **bukan** primitive baru.

**Ekstensi & komponen app-level reusable (bukan library baru):**
- **`DialogBody`** (`components/ui/dialog.jsx`) — wrapper body form dialog (`px-6 py-4` + `space-y-[var(--field-gap)]`). **WAJIB** dipakai di setiap form dialog (2B.10 / R40).
- **`DensityProvider` + `DensityToggle`** (`components/`) — density global Dense⇄Comfortable (CSS var, `localStorage`), sejajar `ThemeProvider`/`ModeToggle`.
- **Halaman Application/CMS** (`pages/app/*`: `OfficesPage`, `RolesPage`) — konsumen nyata design system (FastAPI+MongoDB), WAJIB ikut **R40** (Application CRUD Page Pattern).

> Catatan: Komposisi (menggabungkan beberapa komponen di atas menjadi
> `LoginForm`, `AuthLayout`, halaman, dsb.) **diperbolehkan** dan dianjurkan
> demi reusability — selama tidak membuat **primitive UI baru** dan tidak
> mengubah komponen di `src/components/ui/`.

---

## 6. Aturan Konten (Generic Template)

- Ini project **UI Guidelines / Design System**, **bukan** aplikasi bisnis.
- Dilarang membuat asumsi: nama aplikasi/perusahaan/produk, industri, istilah
  bisnis (perbankan, pembayaran, ERP, CRM, dll), atau copywriting marketing.
- Gunakan **placeholder generik**: `UI Guidelines`, `Sign In`, `Welcome back`,
  `Dashboard`, `Users`, `Settings`, `Search`, `Save`, `Cancel`, `Delete`,
  `Loading...`, `No Data Available`, `Feature One`, dst.

---

## 7. Checklist Sebelum Menyelesaikan Setiap UI

- [ ] Semua kontrol UI berasal dari `src/components/ui/` (tidak ada primitive baru).
- [ ] Tidak ada file di `src/components/ui/` yang dimodifikasi tanpa persetujuan.
- [ ] Semua warna memakai design token (tidak ada warna hardcode).
- [ ] Token tetap HSL; tema shadcn tidak diubah tanpa izin.
- [ ] Responsif (mobile + desktop) dan aksesibel (label, aria, focus, kontras).
- [ ] Konten generik (tanpa konten bisnis).
- [ ] Jika ada kebutuhan di luar design system → sudah dilaporkan & disetujui,
      bukan diimprovisasi.
- [ ] Modifikasi komponen di `ui/`/`composite` menjaga invarian (Compact/2B,
      Typography/2A, warna token-only, density) & dampaknya sudah diverifikasi ke
      semua konsumen — **R38**.
- [ ] **COMPACT (R39):** `space-y` sudah sesuai Tabel Keputusan (2B.5) — **`space-y-6`
      HANYA di root halaman, DILARANG di dalam `CardContent/Header/Footer`** (pakai
      `space-y-3` form / `space-y-4` umum). Avatar profil `h-12 w-12`, grid form `gap-4`.
- [ ] **GUARD:** `bash frontend/docs/design-guard.sh` sudah dijalankan & **lolos (exit 0)**
      (2C.14). Berlaku untuk **halaman/blok baru**, bukan hanya modifikasi komponen.
- [ ] **APP CRUD (R40):** halaman `pages/app/*` mengikuti pola wajib — Card+CardHeader
      (**responsif: `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`** — judul menumpuk di atas & tombol membungkus di mobile; grup tombol `flex flex-wrap gap-2`),
      toolbar (search + **Reset** `FilterX` yang muncul saat search/filter aktif → reset `globalFilter`(+`columnFilters`) + Density),
      DataTable no-wrap, **form dialog pakai `<DialogBody>`**, **Delete destructive (merah)**,
      states via `EmptyState` (no-match tampilkan tombol **Reset** juga), data via `lib/api.js`.
- [ ] **FORM GRID (R41):** field form disusun rapi & sejajar — field utama (mis. Name) full-width,
      field pendek terkait dikelompokkan dalam baris **`grid grid-cols-1 sm:grid-cols-2 items-start gap-4`**.
      **Pakai `<FormItem>` polos untuk SEMUA field** (Combobox sudah block-level & `w-full`);
      **DILARANG mencampur `<FormItem className="flex flex-col">`** dengan `<FormItem>` di baris grid yang sama
      (menyebabkan label/kontrol tidak sejajar). Label **ringkas & 1 baris** (tanpa suffix "(Optional)");
      opsionalitas lewat **placeholder**.

---

## 8. Aturan Modifikasi Komponen (Non-Negotiable)

Komponen bersifat **reusable** (satu sumber) → setiap modifikasi pada
`src/components/ui/` atau `src/components/composite/` **WAJIB** menjaga invarian
design system: **Compact/Spacing (2B)**, **Typography (2A)**, **warna token saja
(R06/R29 — gambar referensi hanya acuan struktur, bukan warna)**, dan **density**.
Sebelum selesai, **verifikasi dampak ke semua konsumen** (min. 2–3 halaman).
Menukar compact demi fitur visual = **pelanggaran / regresi**.

> Definisi lengkap & otoritatif (SSOT): **R38** pada `DESIGN_SYSTEM.md`.

---

## 9. Aturan Compact Density — SEMUA UI (Non-Negotiable)

Memperluas Bagian 8 (R38) agar berlaku **tidak hanya saat memodifikasi komponen**,
tetapi juga saat **membuat halaman / blok / section baru**. Insiden Update 45–46
(UI Profile & Wizard terasa longgar) terjadi karena `space-y-6` dipakai **di dalam
Card** — padahal itu ritme **root halaman**.

**Tabel Keputusan `space-y` (WAJIB dihafal — SSOT di 2B.5 / R39):**

| Konteks | Kelas WAJIB |
|---|---|
| Root halaman (`<div data-testid="*-page">`) | `space-y-6` |
| Antar-section besar di root | `space-y-6` |
| **Isi `CardContent`** (form/section) | **`space-y-3`** (Dense) |
| **Isi `CardContent`** (umum) | **`space-y-4`** |
| Grup terkait / rapat | `space-y-3` / `space-y-2` |

❌ **`space-y-6` DILARANG di dalam `CardContent/CardHeader/CardFooter`.**
Density lain: avatar profil `h-12 w-12` (bukan `h-16`), grid form `gap-4` (bukan `gap-5`),
Card section `px-6 py-4`. Nilai `px` arbitrer & whitespace berlebih = **regresi**.

> SSOT: **R39** + **2B.5/2B.8** pada `DESIGN_SYSTEM.md`.

---

## 10. Panduan Kepatuhan Agen (agar aturan dimengerti & ditaati)

Alur kerja **wajib** setiap kali menyentuh UI — dirancang agar aturan tidak "lolos" lagi:

1. **BACA DULU (sebelum menulis kode):**
   - Tabel Keputusan `space-y` (Bagian 9 / 2B.5) — ini penyebab #1 insiden.
   - Registry komponen (Bagian 5) — jangan bikin primitive baru.
   - `DESIGN_SYSTEM.md` §2A/2B/2C untuk pola yang relevan dengan task.

2. **TIRU pola yang ada (jangan mulai dari nol):** salin struktur halaman/kartu dari
   file sejenis yang sudah patuh (mis. `FormElementsPage.jsx`, `FormLayoutPage.jsx`),
   lalu ganti isinya. Ini otomatis membawa spacing/typography yang benar.

3. **SAAT MENULIS:** untuk setiap `space-y-*`, tanyakan "ini root halaman atau isi Card?"
   → root = `space-y-6`, isi Card = `space-y-3` (form/Dense) / `space-y-4` (umum). Warna hanya token. Ikon hanya
   `lucide-react`. Konten generik.

4. **SEBELUM SELESAI (Definition of Done):**
   - Jalankan **`bash frontend/docs/design-guard.sh`** → harus **lolos (exit 0)**.
   - Centang **Checklist Bagian 7** (termasuk item COMPACT & GUARD).
   - Verifikasi visual via screenshot (halaman baru) atau ≥2–3 konsumen (modifikasi komponen, R38).

5. **JIKA RAGU / DI LUAR REGISTRY:** BERHENTI & lapor (Bagian 4). Jangan berimprovisasi.

6. **PENGECUALIAN yang disengaja:** tandai baris dengan komentar `// guard-allow` **dan**
   catat alasannya di Changelog `DESIGN_SYSTEM.md`. Tanpa keduanya, guard menganggap regresi.

> Prinsip: *"Compact by default, verify by guard."* Aturan yang tidak diperiksa otomatis
> akan terlewat — maka **guard + checklist adalah bagian dari Definition of Done**, bukan opsional.

---

## 11. Governance Lanjutan (rujukan — SSOT di `DESIGN_SYSTEM.md`)

Bagian ini hanya **penunjuk**; definisi lengkap & otoritatif ada di `DESIGN_SYSTEM.md`:

- **Versioning & Release** (SemVer, Breaking Change, Deprecation, Migration, Changelog policy) → **2C.15**.
- **Component Lifecycle** (Experimental/Available/Established/Deprecated/Pending/Removed) → **2C.16**.
- **Feedback Pattern** (kapan Toast vs Inline vs Alert vs Dialog) → **2C.17**.
- **Empty State Registry** (No Data / No Search Result / First-Time / Permission Denied / Offline / Error) → **2C.18**.
- **Search, Filter & Sort** (global; Saved Filter = Deferred) → **2C.19**.
- **Data Display & Formatting** (Number/Currency/Percentage/Date/Time/Status/null) → **2C.20**.
- **Permission Pattern** (Hide/Disable/Read-only/Forbidden) → **2C.21**.
- **Testing Standard** (Visual/A11y/Interaction/Responsive — aturan saja) → **2C.22**.
- **Performance Guideline** (Lazy/Memo/Virtualization/Bundle/Chart/Large Table) → **2C.23**.
- **Application CRUD Page Pattern** (Card+DataTable, `DialogBody`, Delete destructive, states, `lib/api.js`) → **R40**; model backend & API → `ARCHITECTURE.md` §11.
- **Form Field Grid Pattern** (field utama full-width; field pendek terkait di `grid grid-cols-1 sm:grid-cols-2 items-start gap-4`; **`<FormItem>` polos konsisten** untuk semua field — dilarang campur `flex flex-col`; label ringkas 1 baris, opsionalitas via placeholder) → **R41**; dicek otomatis oleh `design-guard.sh` (#8/#9).

> Setiap perubahan komponen/pattern **wajib** tunduk pada Versioning (2C.15) & tercatat di Changelog.
