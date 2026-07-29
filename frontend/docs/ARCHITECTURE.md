# ARCHITECTURE — UI Guidelines (Design System Template)

> Ringkasan arsitektur teknis. Untuk aturan komponen/visual (SSOT), lihat
> `docs/DESIGN_SYSTEM.md` & `docs/DESIGN_SYSTEM_RULES.md`.

## 1. Ikhtisar

Proyek ini adalah **template Design System enterprise, frontend-only** (belum ada
backend/database). Semua data bersifat **mock/placeholder** dan disimpan di state lokal
React atau `src/config/`. Tujuannya: fondasi UI yang konsisten, monochrome-first, compact,
100% shadcn/ui — bukan aplikasi bisnis.

## 2. Tech Stack

| Lapisan | Teknologi |
|---------|-----------|
| Framework | React 19 (CRA + **CRACO**) |
| Routing | React Router v7 |
| Styling | Tailwind CSS v3 + design token HSL 2-layer (`src/index.css`) |
| Komponen | **shadcn/ui** (`src/components/ui/`) — 100% resmi, tidak dimodifikasi tanpa persetujuan |
| Ikon | **lucide-react** (satu-satunya sumber ikon) |
| Form & Validasi | `react-hook-form` + `zod` (`zodResolver`) |
| Tabel | `@tanstack/react-table` |
| Chart | `recharts@2.15.4` (pinned) |
| Tema | `ThemeProvider` (Light/Dark/System, `localStorage`) |
| Dependency lain | Terkurasi & terikat komponen — lihat **R37** |

## 3. Struktur Folder

```
src/
├── components/
│   ├── ui/            # Primitives shadcn/ui (protected — jangan diedit tanpa izin)
│   ├── composite/     # Pola reusable dari primitives (Autocomplete, EmptyState, dll)
│   ├── layout/        # AppLayout, AppSidebar, PageHeader, AuthLayout
│   ├── auth/          # LoginForm, dsb.
│   ├── charts/        # ChartCard
│   ├── previews/      # Demo/katalog (di-exclude dari guard)
│   ├── theme-provider.jsx / mode-toggle.jsx
│   └── ErrorBoundary.jsx   # Exception handling global
├── pages/
│   ├── blocks/        # Sample Blocks (Profile, Wizard, EmptyStates, Permissions, DataDisplay, ...)
│   ├── layouts/       # Sample Layout (DataTable, FormElements, FormLayout)
│   └── charts/        # Sample Charts (Area, Bar, ...)
├── config/            # navigation.js, chartSampleData.js, sampleData.js (data terpusat)
├── lib/               # utils.js (cn), format.js (formatter tampilan)
├── hooks/             # use-mobile, dll
└── index.css          # Design tokens (2-layer) + font
```

## 4. Routing

- Shell `AppLayout` (Sidebar + header + `<Outlet/>`) membungkus semua halaman aplikasi.
- Halaman auth (`/login`, `/forgot-password`) berdiri sendiri (standalone).
- Navigasi **terpusat** di `config/navigation.js` (`navSections`); breadcrumb & sidebar
  diturunkan dari sana (`getBreadcrumb`). Fallback `*` → `/`.
- Tidak ada auth-guard nyata (mock).

## 5. State Management

- **Lokal per-komponen** (`useState`) — tidak ada global store (belum diperlukan).
- **Tema** via Context (`ThemeProvider`) + `localStorage`.
- **Preferensi UI** (mis. density DataTable) di `localStorage`.
- Data = mock (state lokal / `config/`).

## 6. Styling & Design Tokens

- Token **2-layer** di `index.css`: Layer 1 primitives (`--neutral-*`, dll) → Layer 2
  semantic (`--background`, `--primary`, ...) via `var()`. Light di `:root`, Dark di `.dark`.
- **Hanya token semantik** yang boleh dipakai komponen (dilarang warna hardcode) — R05/R06.

## 7. Error & Exception Handling

- **Validasi input**: `zod` + `react-hook-form` di semua form.
- **Feedback**: matriks Toast/Inline/Alert/Dialog (2C.17).
- **Empty/Error states**: composite `EmptyState` (6 varian, 2C.18).
- **Exception boundary**: `ErrorBoundary` global (`components/ErrorBoundary.jsx`)
  membungkus app → fallback `EmptyState error` + Reload; `componentDidCatch` = titik
  integrasi pelaporan error masa depan (mis. Sentry).

## 8. Code Standards

- **Naming**: 2C.10 (Komponen `PascalCase` named-export; Page `PascalCase` default-export;
  primitive shadcn `kebab-case`; props `camelCase`; `data-testid` kebab-case).
- **Formatting**: **Prettier** (`.prettierrc` — 2 spasi, double quotes, trailing comma `all`,
  printWidth 88). **ESLint** via CRA/CRACO (`eslint-plugin-react/-hooks/-jsx-a11y/-import`).
- **Reusability**: utamakan komposisi; ekstrak schema/data ke `config/`/modul terpisah.
- **Logging**: dilarang meninggalkan `console.log/debug/info` di kode final (dicek guard);
  `console.error` hanya untuk pelaporan error (mis. ErrorBoundary).
- **Setiap `data-testid`** wajib pada elemen interaktif & info penting.

## 9. Build & Run

- Dev: `yarn start` (CRACO, port 3000, hot reload) — di lingkungan ini dikelola supervisor.
- Build: `yarn build`.
- Env: `REACT_APP_BACKEND_URL` (frontend) — dipakai saat backend ditambahkan.

## 10. Definition of Done (UI)

1. `bash docs/design-guard.sh` **lolos (exit 0)**.
2. Checklist `DESIGN_SYSTEM_RULES.md` §7 tercentang (Compact/Guard).
3. Testing Standard 2C.22 (Visual/A11y/Interaction/Responsive).
4. Perubahan tercatat di Changelog (Bagian 5) sesuai Versioning 2C.15.

## 11. Rencana Fase Backend (belum ada)

Saat backend ditambahkan, dokumentasikan: **Database Documentation** (skema/koleksi),
**API Documentation** (kontrak endpoint), dan wiring data nyata menggantikan mock di
`config/`/state lokal. Struktur folder & pola UI saat ini sudah siap untuk itu.
