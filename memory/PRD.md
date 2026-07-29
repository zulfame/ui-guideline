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
- (2026-07-29) FormLayoutPage: tata letak dipisah per ukuran — 3 form kecil (Login, Reset, OTP) di grid `md:grid-cols-2 lg:grid-cols-3`; 3 form besar (Register, Change Password, Contact) di grid `md:grid-cols-2`. Diverifikasi via screenshot.
- 78 komponen (Base + Composite) dalam satu data table A-Z.
- Sample Layout: DataTable, Form Elements, Form Layout.
- Pola Header/Body/Footer pada Card & Dialog (compact `px-6 py-4`).
- `autoComplete="off"` global untuk Input; composite PasswordInput dengan ikon mata.
- Audit spacing global (Command & Empty state dirapatkan).

## Backlog
- P1: Layout Patterns tambahan bila diminta (mis. Dashboard Layout).
- P2: Page Specifications (Dashboard, Master Data) via PAGE_SPEC_TEMPLATE.md — SETELAH Layout Patterns matang.
- P3: Arsitektur 2-layer Design Token + Dark Mode.

## Kredensial (mock auth)
- Email: `user@example.com` / Password: `password`
