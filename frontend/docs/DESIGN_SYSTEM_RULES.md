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
  - ✅ **Pengecualian yang diizinkan** (dependency resmi/pendukung shadcn): **lucide-react**
    (ikon) dan **recharts@2.15.4** (data-viz untuk komponen `chart`). Di luar ini,
    library baru wajib disetujui dulu.
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

accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button,
calendar, card, carousel, checkbox, collapsible, command, context-menu, dialog,
drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar,
navigation-menu, pagination, popover, progress, radio-group, resizable,
scroll-area, select, separator, sheet, skeleton, slider, sonner (toast), switch,
table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip.

Ikon: **lucide-react** (diperbolehkan). Dilarang memakai emoji sebagai ikon.

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
