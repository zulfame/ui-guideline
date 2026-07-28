# PAGE SPECIFICATION — Master Data (List)

> Mengikuti `PAGE_SPEC_TEMPLATE.md`. **Generic only** — tanpa konteks bisnis.
> Spec = struktur & UI (belum implementasi). Rujuk `DESIGN_SYSTEM.md` (khususnya
> **2C.7 Table Rules**, **2C.6 Form Rules** untuk dialog, **2C.3 Responsive**).

---

## 1. Informasi Halaman
| Field | Nilai |
|-------|-------|
| Nama Halaman | Master Data (List) |
| Route | `/<resource>` (generik, mis. `/master-data`) |
| Status Spec | 🔵 Proposed |
| Layout | `AppLayout` |
| Auth diperlukan | Ya (mock) |
| Owner Spec | Design System |

## 2. Tujuan Halaman
Pola generik untuk **daftar data (list/table)** dengan toolbar (search + filter + aksi),
tabel data, dan pagination. Tanpa entitas/kolom bisnis nyata — kolom bersifat placeholder.

## 3. Layout
- Shell: `AppLayout`.
- Region konten `p-4 lg:p-6`, root `space-y-6`.
- `PageHeader`: title generik + deskripsi + **slot actions** (tombol primer "Add", generik).
- Susunan section:
  1. `PageHeader` (+ tombol primer di kanan).
  2. Toolbar (search kiri; filter + aksi kanan).
  3. Data Table (card/border-wrapped).
  4. Pagination (kanan bawah).

## 4. Component Registry
| Komponen/Pattern | Status | Peran |
|------------------|--------|-------|
| `PageHeader` | ✅ | Judul + tombol primer |
| `button` | ✅ | Aksi primer & aksi baris (icon) |
| `input` | ⚪→✅ | Search |
| `table` | ✅ | Daftar data |
| `badge` | ✅ | Kolom status |
| `checkbox` | ✅ | Row selection (opsional) |
| `select` / `dropdown-menu` | ⚪→✅ | Filter / aksi baris |
| `pagination` | ⚪→✅ | Navigasi halaman |
| `dialog` / `alert-dialog` | ✅ | Form create/edit / konfirmasi hapus |
| `skeleton` | ✅ | Loading state |
| Data Table (pattern) | ✅ | Rujuk pattern registry |

> `input/select/dropdown-menu/pagination` saat ini ⚪ (available) → aktifkan & set ✅ saat dipakai.

## 5. Component Composition
Rujuk 2C.7 & 2C.11.
```
AppLayout
 └─ content (space-y-6)
     ├─ PageHeader(title, description, actions=[Button primary "Add"])
     ├─ Toolbar (flex items-center justify-between gap-2)
     │   ├─ left:  Input(search, leading icon, placeholder "Search...")
     │   └─ right: Select(filter) + [Button/DropdownMenu actions]
     ├─ div.rounded-md.border
     │   └─ Table
     │       ├─ TableHeader > TableRow > TableHead ([Checkbox] | No | Column A | Column B | Status | Action)
     │       └─ TableBody   > TableRow > TableCell (…)  // empty-state colSpan bila kosong
     └─ Pagination (justify-end)
```
Kolom **placeholder**: `No`, `Column A`, `Column B`, `Status` (Badge), `Action` (icon buttons: Eye/Edit/Delete).

## 6. User Interaction Flow
1. Muat halaman → `Loading State` (skeleton baris).
2. Data siap → render tabel + pagination.
3. **Search:** ketik di Input → filter daftar (debounce).
4. **Filter:** pilih di Select → daftar menyesuaikan.
5. **Sorting:** klik header kolom → toggle asc/desc (`aria-sort`).
6. **Row Selection (opsional):** checkbox baris / select-all → aksi massal muncul di toolbar.
7. **Actions baris:** Eye (lihat), Edit (buka `Dialog` form), Delete (buka `AlertDialog` konfirmasi).
8. **Add:** tombol primer → `Dialog` form create.
9. Tidak ada hasil → `Empty State`.

## 7. Responsive Behavior
Rujuk 2C.3.
- Toolbar: `flex-col` gap-2 pada mobile → `sm:flex-row` (search full-width di mobile).
- Tabel: bungkus `overflow-x-auto`; kolom `Action` tetap di kanan.
- Pagination: tetap kanan; ringkas pada mobile.
- Sidebar: icon-collapsible / Sheet drawer. Padding `p-4`→`lg:p-6`.

## 8. Accessibility
Rujuk R17 / 2C.5–2C.8.
- Header kolom sortable = `button` dalam `TableHead` + `aria-sort`.
- Icon-only actions wajib `aria-label` (mis. "View row", "Edit row", "Delete row").
- Checkbox select-all punya label tersembunyi; fokus & Esc pada Dialog/AlertDialog.
- Kontras AA; `data-testid` pada search, filter, tombol Add, baris, dan aksi.

## 9. States
Rujuk 2C.1 & 2C.7.
| State | Perilaku |
|-------|----------|
| Default | Tabel + toolbar + pagination |
| Loading | Skeleton baris (§9.2) |
| Empty | §9.1 |
| Error | §9.3 |
| Selected | Baris terpilih (Checkbox) → aksi massal aktif |
| Disabled | Kontrol nonaktif (R14), mis. pagination di batas |

### 9.1 Empty State
Baris `colSpan` penuh `h-24 text-center text-muted-foreground` berteks `No Data Available`
(R26). Bila akibat filter/search: sertakan aksi "Clear filters" (generik).

### 9.2 Loading State
`Skeleton` untuk 5–10 baris (tinggi baris mengikuti Density Compact, 2C.4); toolbar tetap aktif.

### 9.3 Error State
`Alert` variant `destructive` di atas tabel + opsi retry (generik, non-teknis).

## 10. Permissions (opsional)
Bila berlaku (generik): aksi "Add/Edit/Delete" hanya muncul untuk pengguna dengan izin
tulis; pengguna baca-saja melihat tabel tanpa kolom Action. Tanpa nama role bisnis nyata.

## 11. Notes
- Seluruh kolom, filter, dan isi baris **wajib generic** ("Column A", "Feature One", status
  Established/Available/Pending atau Active/Inactive generik).
- Form create/edit mengikuti **2C.6 Form Rules**; konfirmasi hapus memakai `AlertDialog`.
- Pola ini menjadi acuan untuk semua halaman berbasis daftar/tabel di masa depan.

## 12. Changelog
| Tanggal | Perubahan |
|---------|-----------|
| 2026-06 | Spec dibuat (🔵 Proposed). |
