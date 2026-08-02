# Tugas Tertunda — Revisi Halaman API Clients (2026-06-02)

Dihentikan atas permintaan user. Tool `execute_bash` gagal berulang (pytest/curl
tidak bisa dijalankan), jadi verifikasi belum tuntas.

## Kode SUDAH diubah (code-complete, BELUM diverifikasi end-to-end)

### Backend `/app/backend/server.py`
- Hapus **Scopes** sepenuhnya:
  - Hapus `AVAILABLE_SCOPES`, `_sanitize_scopes`, endpoint `GET /clients/scopes`.
  - `ClientCreate` / `ClientUpdate`: field `scopes` dihapus.
  - `_client_public`: field `scopes` dihapus.
  - `create_client` / `update_client`: tidak lagi menyimpan `scopes`.
  - `_apikey_authorize`: sekarang hanya blokir prefix management/auth/database/login-attempts;
    selain itu key aktif diizinkan (fungsi API belum didefinisikan). `_APIKEY_RESOURCE_SCOPES` dihapus.

### Frontend `/app/frontend/src/pages/app/ClientsPage.jsx` (ditulis ulang penuh)
- Mengikuti pola kanonik R40 (`OfficesPage`): Card + **TanStack DataTable**,
  header **sortable** (SortableHeader), toolbar **search + Reset + DensityToggle**,
  **EmptyState** standar (variant first-time / error / filtered), footer **pagination**.
- Row actions dipindah ke **DropdownMenu** (MoreHorizontal): View usage, Edit,
  Regenerate key, Revoke (jika aktif), separator, Delete (destruktif).
- Form Create/Edit pakai **DialogBody** + grid R41 (`grid-cols-1 sm:grid-cols-2 items-start gap-4`).
- **Scopes dihapus** dari kolom tabel dan dari dialog form.
- Dialog lain tetap: reveal key (sekali tampil), usage chart; konfirmasi regenerate/revoke/delete pakai AlertDialog.

## Status verifikasi
- `design-guard.sh`: **PASS (exit 0)** — sudah dijalankan, clean.
- `pytest`: **BELUM dijalankan** (bash gagal). Perlu `cd /app/backend && python -m pytest -q`.
  - Catatan: tidak ada `test_clients.py`, jadi risiko rendah; tapi tetap harus dikonfirmasi.
  - Bersihkan polusi data test bila perlu: hapus roles/levels dengan prefix `TEST_`.
- Smoke test backend BELUM dijalankan. Perlu cek:
  - `POST /api/clients {name, rate_limit, rate_window_seconds}` (tanpa scopes) → 201 + `api_key`.
  - `GET /api/clients` tidak lagi punya field `scopes`.
  - `PUT /api/clients/{id}` tanpa scopes → 200.
- Smoke test frontend BELUM (screenshot / testing_agent) untuk halaman `/clients`.

## Langkah lanjut saat dilanjutkan
1. Restart backend bila perlu: `sudo supervisorctl restart backend`.
2. Jalankan `python -m pytest -q` di `/app/backend` — pastikan semua lolos.
3. Smoke test `/clients`: tambah client, edit, regenerate, revoke, delete, search, sort, pagination.
4. (Opsional, permintaan user 'a') lanjut modularisasi server.py.
