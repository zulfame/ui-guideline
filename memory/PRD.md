# PRD — UI Guidelines / Design System Template

## Problem Statement
Membangun **template UI Guidelines / Design System** generik yang menjadi fondasi
untuk berbagai aplikasi masa depan (ERP, CRM, HRIS, Banking, dll). **BUKAN** aplikasi
bisnis spesifik. Semua konten memakai **placeholder generik** ("Application Name",
"Welcome Back", "Feature One", dst).

Bahasa komunikasi user: **Bahasa Indonesia**.

## Core Requirements (static)
- 100% komponen resmi **shadcn/ui**. Dilarang membuat primitive UI baru / library lain
  tanpa izin eksplisit (pengecualian yang disetujui: `lucide-react`, `recharts@2.15.4`).
- Visual: monochrome-first, clean, minimal, modern, enterprise. Warna hanya untuk
  aksen/status.
- Font primary **Geist**; ikon hanya **lucide-react**.
- Token desain HSL di `index.css`; komponen memakai variabel semantik shadcn
  (`bg-primary`, `text-muted-foreground`) — tanpa warna hardcoded.
- Governance ketat: `docs/DESIGN_SYSTEM.md` (registry), `docs/DESIGN_SYSTEM_RULES.md`
  (kontrak), `docs/BACKLOG.md` (parked).

## Architecture
- Frontend-only React (CRA) + React Router v7. Autentikasi & data chart = MOCK.
- `src/config/navigation.js` = sumber tunggal sidebar + breadcrumb.
- App shell: `AppLayout` + `AppSidebar` (shadcn sidebar-07, collapse-to-icon, sticky header 65px).

## Implemented
- (Sesi sebelumnya) Login generik, App shell, 7 halaman Sample Charts (Recharts 2.15.4),
  docs governance, font Geist, ikon lucide.
- **2026-06 (sesi ini):**
  - Sidebar block preview di-wire ke `/design-system/blocks/sidebar`; breadcrumb
    dinetralkan ke placeholder generik.
  - Halaman standalone **Forgot Password** (`/forgot-password`) + `ForgotPasswordForm`
    (schema `resetSchema`); link "Forgot password?" di LoginForm kini navigate ke sana.
  - **Login & Forgot block preview** (`/design-system/blocks/login`, `/blocks/forgot`)
    via iframe berbingkai (mirror showcase shadcn).
  - **Components showcase page** (`/design-system/components`): Buttons, Badges, Inputs,
    Selection controls, Tabs, Feedback, Avatar+Tooltip, Table.
  - Semua 4 halaman diverifikasi via screenshot (render OK).

## Backlog / Remaining
- **P2**: Global form-level Alert untuk empty state / "No Data Available".
- **P2**: Dark mode toggle.
- **P3**: "Reduced Motion" accessibility handling.
(Detail parked di `frontend/docs/BACKLOG.md`.)

## Credentials (mock)
- Login: `user@example.com` / `password` (lihat `/app/memory/test_credentials.md`).
