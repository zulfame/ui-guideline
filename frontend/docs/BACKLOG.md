# BACKLOG — Deferred Components & Rules (Parked)

> Daftar komponen/aturan yang **sudah disebut** namun **belum waktunya dikerjakan**.
> Item di sini **tidak boleh diimprovisasi** lebih dulu. Aktifkan hanya setelah
> ada arahan/persetujuan, lalu pindahkan ke `DESIGN_SYSTEM.md` (status ✅) dan
> catat di Changelog.

Status: 🔒 Deferred (ditunda) · ⏳ Menunggu halaman terkait

---

## 1. Komponen / Fitur Ditunda

| ID | Item | Status | Alasan / Kapan dikerjakan | Komponen shadcn terkait |
|----|------|--------|---------------------------|-------------------------|
| B1 | **Dark Mode Toggle** | 🔒 | Fokus **Light Mode** dulu sampai semua komponen selesai. Token light+dark sudah tersedia di `index.css`. | `switch` / `dropdown-menu` (+ `next-themes`) |
| B2 | **Empty State / "No Data Available"** | ⏳ | Distandarkan saat halaman **data** (tabel/list) dibuat. | `skeleton`, `table`, `card` |
| B3 | **Reduced Motion** (`prefers-reduced-motion`) | 🔒 | Dikategorikan sebagai **peningkatan performa/aksesibilitas gerak**; dikerjakan nanti. Menonaktifkan animasi (mis. `animate-spin`, transisi Sheet) bagi pengguna yang meminta pengurangan animasi. | utility CSS / Tailwind `motion-reduce:*` |

---

## 2. Aturan Ditunda (aktif saat item terkait dikerjakan)

| ID | Aturan | Status | Keterangan |
|----|--------|--------|------------|
| BR1 | **Theme (Light/Dark) switching** | 🔒 | Aturan R28. Saat ini Light Mode only; pola pergantian tema ditunda (lihat B1). |
| BR2 | **Empty State pattern** | ⏳ | Aturan R26. Pola `Skeleton` (loading) + teks `No Data Available` (kosong) — dibuat bersama halaman data (lihat B2). |

---

## 3. Sudah Dipindahkan ke DESIGN_SYSTEM.md (bukan lagi backlog)

| Item | Status baru | Catatan |
|------|-------------|---------|
| Alert form-level | ✅ Established | Diaktifkan di `LoginForm` (variant `destructive`) untuk error autentikasi global. |

---

> Cara mengangkat item dari backlog:
> 1. Dapatkan arahan/persetujuan.
> 2. Implementasi memakai komponen resmi shadcn/ui (tanpa improvisasi).
> 3. Update `DESIGN_SYSTEM.md` (Bagian 1/2 → ✅) + Changelog.
> 4. Hapus/perbarui entri terkait di file ini.
