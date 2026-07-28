# PAGE SPECIFICATION — Dashboard

> Mengikuti `PAGE_SPEC_TEMPLATE.md`. **Generic only** — tanpa konteks bisnis.
> Spec = struktur & UI (belum implementasi). Rujuk `DESIGN_SYSTEM.md`.

---

## 1. Informasi Halaman
| Field | Nilai |
|-------|-------|
| Nama Halaman | Dashboard |
| Route | `/` |
| Status Spec | 🔵 Proposed |
| Layout | `AppLayout` |
| Auth diperlukan | Ya (mock) |
| Owner Spec | Design System |

## 2. Tujuan Halaman
Halaman ringkasan generik: menampilkan sekumpulan kartu metrik, satu area visualisasi
(chart), dan satu area daftar/tabel ringkas. Bersifat placeholder — tanpa metrik bisnis nyata.

## 3. Layout
- Shell: `AppLayout` (sidebar + header fixed `h-[65px]`).
- Region konten `p-4 lg:p-6`, root `space-y-6` (2B.5).
- `PageHeader`: title **"Dashboard"** + deskripsi generik (opsional slot actions).
- Susunan section (atas → bawah):
  1. Baris kartu metrik (grid).
  2. Area chart (satu/dua `ChartCard`).
  3. Tabel ringkas (card-wrapped).

## 4. Component Registry
| Komponen/Pattern | Status | Peran |
|------------------|--------|-------|
| `PageHeader` | ✅ | Judul + deskripsi |
| `card` | ✅ | Kartu metrik & pembungkus tabel |
| `ChartCard` | ✅ | Area visualisasi |
| `chart` (recharts@2.15.4) | ✅ | Grafik di dalam ChartCard |
| `table` | ✅ | Tabel ringkas |
| `badge` | ✅ | Status accent pada baris tabel |
| `button` | ✅ | Aksi (opsional, mis. ikon Eye) |
| `skeleton` | ✅ | Loading state |
| `separator` | ✅ | Pemisah opsional |

## 5. Component Composition
Rujuk 2C.11. Kartu metrik memakai komposisi Card (2C.11 · Card).
```
AppLayout
 └─ content (space-y-6)
     ├─ PageHeader(title="Dashboard", description)
     ├─ Metrics (grid gap-4 md:grid-cols-2 lg:grid-cols-4)
     │   └─ Card × N
     │       └─ CardHeader(CardTitle "Metric One" text-base, CardDescription)
     │       └─ CardContent (nilai placeholder + delta muted)
     ├─ Charts (grid gap-4 lg:grid-cols-2)
     │   └─ ChartCard(title, description, config)  // 1 elemen chart
     └─ Recent (Card > CardHeader + CardContent)
         └─ div.rounded-md.border > Table(No | Column A | Status | Action)
```

## 6. User Interaction Flow
1. Halaman dimuat → `Loading State` (skeleton pada kartu/tabel/chart).
2. Data siap → render metrik, chart, tabel.
3. Klik ikon Eye pada baris tabel → aksi generik (mis. buka detail — placeholder).
4. Tidak ada data → `Empty State` per section.

## 7. Responsive Behavior
Rujuk 2C.3.
- Metrics: `grid-cols-1` (mobile) → `md:grid-cols-2` → `lg:grid-cols-4`, `gap-4`.
- Charts: `1-col` → `lg:grid-cols-2`.
- Tabel: bungkus `overflow-x-auto` pada layar kecil.
- Sidebar: icon-collapsible (≥`md`) / Sheet drawer (<`md`). Padding `p-4`→`lg:p-6`.

## 8. Accessibility
Rujuk R17 / 2C.5. Satu H1 (`PageHeader`); kartu metrik gunakan heading `text-base`
(bukan H1 ganda). Ikon dekoratif `aria-hidden`; icon-button `aria-label`. Kontras AA.
`data-testid` pada kartu, baris tabel, dan tombol aksi.

## 9. States
Rujuk 2C.1.
| State | Perilaku |
|-------|----------|
| Default | Metrik + chart + tabel tampil |
| Loading | Skeleton (§9.2) |
| Empty | Per section (§9.1) |
| Error | Alert destructive (§9.3) |
| Hover/Focus | Kartu/baris interaktif mengikuti R11–R12 |

### 9.1 Empty State
- Metrics: kartu tampil dengan nilai `—` (placeholder), bukan disembunyikan.
- Chart: area kosong + teks `No Data Available`.
- Tabel: baris `colSpan` `h-24 text-center` `No Data Available` (R26).

### 9.2 Loading State
Skeleton: kartu (blok `h-24`), chart (blok `aspect-video`/tinggi tetap), tabel (3–5 baris skeleton).

### 9.3 Error State
`Alert` variant `destructive` menggantikan section yang gagal + opsi retry (generik).

## 10. Permissions (opsional)
Tidak berlaku pada template generic ini.

## 11. Notes
- Nilai metrik, kategori chart, dan isi tabel **wajib placeholder generik** ("Metric One",
  "Column A", "Feature One"). Tanpa istilah bisnis.
- Saat ini halaman `/` yang ada masih berupa blok placeholder (`bg-muted/50`); spec ini
  menjadi acuan struktur final bila diimplementasikan.

## 12. Changelog
| Tanggal | Perubahan |
|---------|-----------|
| 2026-06 | Spec dibuat (🔵 Proposed). |
