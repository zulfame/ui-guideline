import {
  Code2,
  Database,
  Layers3,
  Plug,
  ShieldCheck,
  Gauge,
  FolderTree,
  Activity,
  DatabaseBackup,
  BookOpen,
} from "lucide-react";

/**
 * Development Guidelines — konten data-driven (SSOT in-app).
 * Setiap grup punya daftar topik; setiap topik memuat:
 *  - principle: ringkasan prinsip (1–2 kalimat)
 *  - rules: aturan wajib (array string)
 *  - dos / donts: praktik yang dianjurkan / dilarang
 *  - checklist: item Definition of Done
 *  - code (opsional): { language, good, bad } contoh benar/salah
 *
 * Bahasa: Indonesia. Selaras dengan stack aplikasi ini
 * (React + FastAPI + MongoDB) namun ditulis agar generik & reusable.
 * Dokumen tertulis penuh: docs/DEVELOPMENT_GUIDELINES.md
 */

export const guidelineGroups = [
  {
    id: "code",
    title: "Code",
    icon: Code2,
    summary:
      "Standar penulisan kode: struktur, penamaan, keterbacaan, reusability, penanganan error, logging, konfigurasi, dan validasi input.",
    topics: [
      {
        id: "code-structure",
        title: "Code Structure",
        principle:
          "Susun kode berdasarkan fitur/domain, bukan berdasarkan tipe file, agar mudah ditemukan dan diubah. Satu modul = satu tanggung jawab yang jelas.",
        rules: [
          "Gunakan struktur folder konsisten (mis. backend: routers/services/models; frontend: pages/components/config/lib).",
          "Batasi ukuran file — pecah file > ~300–400 baris menjadi unit yang lebih kecil.",
          "Hindari import melingkar (circular import); jaga arah dependensi satu arah.",
          "Kelompokkan import: standar library → third-party → internal.",
        ],
        dos: [
          "Kelompokkan berdasarkan fitur (feature-first).",
          "Ekspor lewat satu titik (index/barrel) bila memperjelas API modul.",
        ],
        donts: [
          "Menaruh semua logika di satu file raksasa (God file).",
          "Mencampur logika UI, akses data, dan aturan bisnis dalam satu fungsi.",
        ],
        checklist: [
          "Struktur folder mengikuti konvensi proyek.",
          "Tidak ada file > 400 baris tanpa alasan.",
          "Tidak ada circular import.",
        ],
      },
      {
        id: "naming-convention",
        title: "Naming Convention",
        principle:
          "Nama harus mengungkap maksud (intention-revealing). Nama yang baik menghilangkan kebutuhan komentar.",
        rules: [
          "Python: `snake_case` untuk variabel/fungsi, `PascalCase` untuk kelas, `UPPER_SNAKE` untuk konstanta.",
          "JavaScript/React: `camelCase` untuk variabel/fungsi, `PascalCase` untuk komponen & tipe.",
          "Boolean diawali `is/has/should/can` (mis. `isActive`, `hasAccess`).",
          "Hindari singkatan ambigu & angka magic — gunakan konstanta bernama.",
        ],
        dos: [
          "Gunakan nama domain yang konsisten di seluruh layer.",
          "Nama fungsi = kata kerja; nama variabel = kata benda.",
        ],
        donts: [
          "Nama generik seperti `data`, `temp`, `handle`, `foo`.",
          "Nama berbeda untuk konsep sama di modul berbeda.",
        ],
        checklist: [
          "Konvensi casing sesuai bahasa.",
          "Tidak ada magic number/string.",
          "Boolean memakai prefiks is/has/should.",
        ],
        code: {
          language: "python",
          good: "MAX_RETRY = 3\n\ndef is_office_active(office):\n    return office.get(\"status\") == \"active\"",
          bad: "def check(o):\n    if o[\"s\"] == 1:  # 1 = ?\n        return True",
        },
      },
      {
        id: "code-readability",
        title: "Code Readability",
        principle:
          "Kode dibaca jauh lebih sering daripada ditulis. Optimalkan untuk pembaca berikutnya, bukan untuk keringkasan.",
        rules: [
          "Fungsi pendek & fokus (idealnya < 30–40 baris).",
          "Batasi nesting; gunakan early return / guard clause.",
          "Komentar menjelaskan 'mengapa', bukan 'apa'.",
          "Konsisten dengan formatter (Prettier / Black) — jangan format manual.",
        ],
        dos: [
          "Pakai early return untuk mengurangi indentasi.",
          "Beri nama pada ekspresi kompleks lewat variabel antara.",
        ],
        donts: [
          "Nested if/else berlapis-lapis.",
          "Baris satu ekspresi yang terlalu 'pintar' dan sulit dibaca.",
        ],
        checklist: [
          "Nesting maksimal 2–3 level.",
          "Tidak ada dead code / kode terkomentari.",
          "Sudah diformat oleh linter/formatter.",
        ],
      },
      {
        id: "code-reusability",
        title: "Code Reusability",
        principle:
          "DRY (Don't Repeat Yourself) — abstraksi muncul dari duplikasi nyata (rule of three), bukan spekulasi dini.",
        rules: [
          "Ekstrak util/helper reusable ke lokasi bersama (mis. `lib/`, `utils/`).",
          "Utamakan komposisi daripada duplikasi copy-paste.",
          "Jaga util tetap pure & tanpa efek samping bila memungkinkan.",
          "Jangan over-engineer — abstraksi harus membayar dirinya sendiri.",
        ],
        dos: [
          "Terapkan 'rule of three' sebelum mengabstraksi.",
          "Buat fungsi kecil yang dapat dikomposisikan.",
        ],
        donts: [
          "Abstraksi prematur yang menambah kompleksitas.",
          "Duplikasi logika bisnis di banyak tempat.",
        ],
        checklist: [
          "Tidak ada duplikasi logika signifikan.",
          "Util reusable berada di lokasi bersama.",
          "Abstraksi punya justifikasi jelas.",
        ],
      },
      {
        id: "separation-of-concerns",
        title: "Separation of Concerns",
        principle:
          "Pisahkan lapisan: presentasi (UI), aplikasi (service/logika), dan data (repository/akses). Tiap lapisan hanya tahu kontrak lapisan di bawahnya.",
        rules: [
          "Komponen UI tidak mengakses database/HTTP langsung — lewat service/`lib/api`.",
          "Logika bisnis di service layer, bukan di router/komponen.",
          "Akses data terisolasi di satu lapisan (repository/DAL).",
          "Konfigurasi & rahasia tidak bocor ke lapisan presentasi.",
        ],
        dos: [
          "Router tipis → delegasikan ke service.",
          "Frontend memanggil backend hanya via `lib/api.js`.",
        ],
        donts: [
          "Query database langsung di dalam handler route yang gemuk.",
          "Menaruh aturan bisnis di komponen React.",
        ],
        checklist: [
          "UI ↔ service ↔ data terpisah jelas.",
          "Tidak ada akses data langsung dari UI.",
          "Router tetap tipis.",
        ],
      },
      {
        id: "error-handling",
        title: "Error Handling",
        principle:
          "Gagal dengan cepat dan jelas. Kembalikan error yang dapat ditindaklanjuti, jangan sembunyikan kegagalan.",
        rules: [
          "Backend: kembalikan status HTTP tepat (400/401/403/404/409/422/500) + pesan konsisten.",
          "Jangan menelan error (empty catch) tanpa logging/penanganan.",
          "Bedakan error yang bisa dipulihkan vs fatal.",
          "Frontend: tampilkan feedback (toast/inline) sesuai pola design system.",
        ],
        dos: [
          "Sertakan konteks pada error (id, operasi).",
          "Gunakan tipe/kelas error spesifik.",
        ],
        donts: [
          "Mengembalikan 200 untuk kondisi gagal.",
          "Menampilkan stack trace mentah ke pengguna.",
        ],
        checklist: [
          "Status code sesuai konteks.",
          "Tidak ada catch kosong.",
          "Pesan error ramah pengguna di UI.",
        ],
        code: {
          language: "python",
          good: "office = await db.offices.find_one({\"id\": office_id})\nif not office:\n    raise HTTPException(status_code=404, detail=\"Office not found\")",
          bad: "try:\n    do_work()\nexcept Exception:\n    pass  # ditelan diam-diam",
        },
      },
      {
        id: "exception-handling",
        title: "Exception Handling",
        principle:
          "Tangkap exception sedekat mungkin dengan tempat ia bisa ditangani secara bermakna; sisanya biarkan naik ke handler global.",
        rules: [
          "Tangkap exception spesifik, bukan `except Exception` menyeluruh (kecuali di boundary global).",
          "Sediakan global exception handler (mis. FastAPI handler / React ErrorBoundary).",
          "Bersihkan resource lewat `finally` / context manager.",
          "Jangan gunakan exception untuk alur kontrol normal.",
        ],
        dos: [
          "Gunakan `with`/context manager untuk resource.",
          "Log exception tak terduga di boundary global.",
        ],
        donts: [
          "Menangkap exception hanya untuk melempar ulang tanpa nilai tambah.",
          "Membocorkan detail internal pada response.",
        ],
        checklist: [
          "Ada handler global (backend & frontend).",
          "Tangkapan exception spesifik.",
          "Resource dibersihkan dengan benar.",
        ],
      },
      {
        id: "logging",
        title: "Logging",
        principle:
          "Log adalah alat observasi, bukan tempat sampah. Gunakan level yang tepat dan format terstruktur.",
        rules: [
          "Gunakan logger terkonfigurasi, JANGAN `print`/`console.log` di produksi.",
          "Level tepat: DEBUG < INFO < WARNING < ERROR < CRITICAL.",
          "Jangan mencatat data sensitif (password, token, PII).",
          "Sertakan konteks korelasi (request id / user id) bila ada.",
        ],
        dos: [
          "Gunakan `logging` (Python) / logger terpusat.",
          "Log terstruktur (key-value) agar mudah dicari.",
        ],
        donts: [
          "Log payload penuh berisi rahasia.",
          "Spam log INFO untuk hal rutin bervolume tinggi.",
        ],
        checklist: [
          "Tidak ada `print`/`console.log` (dicek design-guard).",
          "Tidak ada rahasia di log.",
          "Level log sesuai konteks.",
        ],
      },
      {
        id: "configuration-management",
        title: "Configuration Management",
        principle:
          "Konfigurasi dipisah dari kode (12-factor). Nilai berbeda per environment berasal dari environment variable, bukan hardcode.",
        rules: [
          "Baca konfigurasi dari environment (`os.environ` / `process.env`).",
          "JANGAN hardcode URL, port, kredensial, atau nama database.",
          "Backend memakai `MONGO_URL`; frontend memakai `REACT_APP_BACKEND_URL`.",
          "Sediakan default aman & validasi variabel wajib saat startup.",
        ],
        dos: [
          "Simpan rahasia di `.env` (tidak di-commit).",
          "Dokumentasikan semua variabel yang dibutuhkan.",
        ],
        donts: [
          "Menaruh secret langsung di source code.",
          "Menuliskan URL/port secara literal di kode.",
        ],
        checklist: [
          "Tidak ada nilai hardcode URL/port/secret.",
          "Variabel wajib divalidasi saat startup.",
          "`.env` tidak masuk version control.",
        ],
      },
      {
        id: "input-validation",
        title: "Input Validation",
        principle:
          "Jangan percaya input apa pun. Validasi di batas sistem (boundary) sebelum diproses. Validasi client untuk UX, validasi server untuk keamanan.",
        rules: [
          "Gunakan schema-based validation: Pydantic (backend), Zod (frontend).",
          "Validasi tipe, rentang, panjang, format, dan enum.",
          "Validasi server bersifat wajib — validasi client hanya pelengkap.",
          "Kembalikan pesan validasi spesifik (422) yang bisa ditindaklanjuti.",
        ],
        dos: [
          "Definisikan model/schema untuk setiap payload.",
          "Whitelist nilai yang diizinkan, bukan blacklist.",
        ],
        donts: [
          "Mengandalkan validasi frontend saja.",
          "Menerima field tak dikenal tanpa kontrol.",
        ],
        checklist: [
          "Setiap endpoint punya schema request.",
          "Form frontend punya validasi (Zod).",
          "Error validasi jelas & konsisten.",
        ],
        code: {
          language: "python",
          good: "class OfficeCreate(BaseModel):\n    code: str = Field(min_length=1, max_length=20)\n    name: str = Field(min_length=1)\n    radius: int = Field(gt=0)",
          bad: "def create(payload: dict):\n    code = payload[\"code\"]  # tanpa validasi",
        },
      },
    ],
  },

  {
    id: "database",
    title: "Database",
    icon: Database,
    summary:
      "Desain skema, struktur tabel/koleksi, penamaan kolom, tipe data, primary/foreign key, indeks, constraint, normalisasi, dan audit field.",
    topics: [
      {
        id: "schema-design",
        title: "Database Schema Design",
        principle:
          "Skema mencerminkan domain dengan jelas dan berevolusi terkendali. Aplikasi ini memakai MongoDB — desain berbasis pola akses (access pattern), namun prinsip relasional tetap relevan.",
        rules: [
          "Rancang skema mengikuti pola query/akses yang nyata.",
          "Gunakan UUID (string) sebagai identitas — JANGAN ekspos ObjectId Mongo.",
          "Konsisten antar koleksi (bentuk dokumen seragam untuk entitas sama).",
          "Kelola perubahan skema lewat migrasi/versi terdokumentasi.",
        ],
        dos: [
          "Embed data yang selalu dibaca bersama; reference bila mandiri.",
          "Simpan timestamp dalam UTC (ISO 8601).",
        ],
        donts: [
          "Bentuk dokumen tidak konsisten antar record.",
          "Mengekspos `_id`/ObjectId ke API.",
        ],
        checklist: [
          "Identitas memakai UUID string.",
          "Bentuk dokumen konsisten.",
          "Perubahan skema terdokumentasi.",
        ],
      },
      {
        id: "table-structure",
        title: "Table / Collection Structure",
        principle:
          "Satu tabel/koleksi mewakili satu entitas domain yang kohesif. Hindari kolom serba-guna yang maknanya berubah-ubah.",
        rules: [
          "Satu koleksi = satu konsep (offices, roles, levels).",
          "Hindari field 'catch-all' yang ambigu.",
          "Pisahkan data volatile berfrekuensi tinggi dari data referensi stabil.",
          "Batasi kedalaman nesting dokumen agar mudah di-query.",
        ],
        dos: [
          "Rancang dokumen sesuai unit baca/tulis.",
          "Gunakan enum/status terbatas untuk state.",
        ],
        donts: [
          "Menyimpan banyak entitas berbeda dalam satu koleksi.",
          "Nesting terlalu dalam (> 3–4 level).",
        ],
        checklist: [
          "Koleksi kohesif per entitas.",
          "Tidak ada field catch-all.",
          "Nesting wajar.",
        ],
      },
      {
        id: "column-naming",
        title: "Column / Field Naming",
        principle:
          "Nama field konsisten, deskriptif, dan seragam lintas koleksi untuk konsep yang sama.",
        rules: [
          "Gunakan `snake_case` konsisten untuk field.",
          "Nama sama untuk konsep sama (mis. `created_at` di semua koleksi).",
          "Boolean diawali `is_/has_`.",
          "Foreign reference diberi sufiks `_id` (mis. `parent_id`, `level_id`).",
        ],
        dos: [
          "Standarkan nama audit (`created_at`, `updated_at`).",
          "Gunakan istilah domain yang dibakukan.",
        ],
        donts: [
          "Campur `camelCase` & `snake_case` di database.",
          "Singkatan tidak jelas (`cd`, `nm`).",
        ],
        checklist: [
          "Casing field konsisten.",
          "Referensi memakai sufiks `_id`.",
          "Nama audit seragam.",
        ],
      },
      {
        id: "data-type-selection",
        title: "Data Type Selection",
        principle:
          "Pilih tipe paling tepat & paling ketat untuk data — akurat, hemat, dan mencegah data korup.",
        rules: [
          "Simpan waktu sebagai datetime UTC (bukan string bebas).",
          "Angka sebagai number (int/float sesuai kebutuhan), bukan string.",
          "Nilai moneter: hindari float; gunakan integer terkecil (mis. sen) atau Decimal.",
          "Gunakan enum/daftar terbatas untuk status/kategori.",
        ],
        dos: [
          "Normalisasi format tanggal ke ISO 8601.",
          "Validasi rentang numerik (lat/long/radius).",
        ],
        donts: [
          "Menyimpan angka/boolean sebagai string.",
          "Memakai float untuk uang.",
        ],
        checklist: [
          "Tipe data sesuai makna.",
          "Waktu dalam UTC.",
          "Tidak ada float untuk uang.",
        ],
      },
      {
        id: "primary-key-strategy",
        title: "Primary Key Strategy",
        principle:
          "Kunci utama stabil, unik, dan tidak membawa makna bisnis. UUID adalah default aplikasi ini.",
        rules: [
          "Gunakan UUID v4 (string) sebagai primary key `id`.",
          "JANGAN gunakan ObjectId Mongo sebagai identitas publik (tidak JSON-serializable & bocor info).",
          "Kunci bersifat immutable setelah dibuat.",
          "Jangan pakai kunci bisnis (email/kode) sebagai primary key.",
        ],
        dos: [
          "Generate UUID di aplikasi saat create.",
          "Index field `id` untuk lookup cepat.",
        ],
        donts: [
          "Mengekspos ObjectId ke frontend.",
          "Mengubah nilai primary key.",
        ],
        checklist: [
          "Primary key = UUID string.",
          "Tidak ada ObjectId di API.",
          "Key immutable.",
        ],
      },
      {
        id: "foreign-key-relationship",
        title: "Foreign Key Relationship",
        principle:
          "Relasi antar entitas eksplisit dan dijaga integritasnya oleh aplikasi (MongoDB tidak menegakkan FK).",
        rules: [
          "Simpan referensi sebagai `<entity>_id` (UUID).",
          "Validasi keberadaan referensi sebelum menyimpan (mis. `level_id` harus ada).",
          "Tangani penghapusan: cascade / set-null / promote anak (sesuai domain).",
          "Cegah relasi tidak valid (self-reference, siklus).",
        ],
        dos: [
          "Validasi FK di service layer.",
          "Bersihkan referensi menggantung saat delete.",
        ],
        donts: [
          "Menyimpan referensi tanpa validasi.",
          "Meninggalkan referensi menggantung setelah delete.",
        ],
        checklist: [
          "Referensi divalidasi saat write.",
          "Kebijakan delete jelas.",
          "Anti-siklus untuk relasi hierarki.",
        ],
      },
      {
        id: "index-management",
        title: "Index Management",
        principle:
          "Indeks mempercepat baca dengan biaya tulis & penyimpanan. Buat indeks berdasarkan pola query nyata.",
        rules: [
          "Index field yang sering di-filter/sort/join.",
          "Buat unique index untuk field unik (mis. `code`, `name`).",
          "Gunakan compound index sesuai urutan query.",
          "Pantau & buang indeks yang tidak terpakai.",
        ],
        dos: [
          "Definisikan unique index pada startup.",
          "Verifikasi rencana query untuk operasi berat.",
        ],
        donts: [
          "Over-indexing yang memperlambat tulis.",
          "Mengandalkan full-collection scan.",
        ],
        checklist: [
          "Field unik punya unique index.",
          "Query panas ter-index.",
          "Tidak ada indeks sia-sia.",
        ],
      },
      {
        id: "constraint-management",
        title: "Constraint Management",
        principle:
          "Constraint menjaga data selalu valid. Karena MongoDB minim constraint bawaan, aplikasi wajib menegakkannya.",
        rules: [
          "Tegakkan keunikan di dua lapis: unique index + cek aplikasi (409 saat konflik).",
          "Wajibkan field required lewat schema (Pydantic).",
          "Validasi rentang & format sebelum simpan.",
          "Jaga invarian domain (mis. hanya satu atasan langsung).",
        ],
        dos: [
          "Kembalikan 409 untuk pelanggaran keunikan.",
          "Validasi lengkap sebelum persist.",
        ],
        donts: [
          "Mengandalkan database saja untuk semua aturan.",
          "Membiarkan state tidak konsisten tersimpan.",
        ],
        checklist: [
          "Unique dijaga index + aplikasi.",
          "Required divalidasi.",
          "Invarian domain terjaga.",
        ],
      },
      {
        id: "database-normalization",
        title: "Database Normalization",
        principle:
          "Normalisasi mengurangi duplikasi & anomali; denormalisasi terukur boleh untuk performa baca. Di document DB, keseimbangan embed vs reference adalah kunci.",
        rules: [
          "Reference untuk data yang dipakai banyak entitas & sering berubah.",
          "Embed untuk data yang selalu dibaca bersama induknya.",
          "Denormalisasi hanya bila terbukti perlu & dijaga konsistensinya.",
          "Hindari duplikasi sumber kebenaran (single source of truth).",
        ],
        dos: [
          "Dokumentasikan alasan denormalisasi.",
          "Sinkronkan salinan data denormal saat update.",
        ],
        donts: [
          "Menyalin data berubah-ubah ke banyak tempat tanpa sinkronisasi.",
          "Embed data besar yang jarang dipakai.",
        ],
        checklist: [
          "Keputusan embed vs reference beralasan.",
          "Denormalisasi terdokumentasi.",
          "Tidak ada duplikasi SSOT yang berisiko.",
        ],
      },
      {
        id: "audit-fields",
        title: "Audit Fields",
        principle:
          "Setiap entitas melacak jejak perubahan minimal: kapan dibuat & diubah, idealnya oleh siapa.",
        rules: [
          "Wajibkan `created_at` & `updated_at` (UTC) di setiap koleksi.",
          "Set `created_at` sekali; perbarui `updated_at` di setiap perubahan.",
          "Tambahkan `created_by`/`updated_by` bila ada konteks pengguna.",
          "Pertimbangkan soft delete (`deleted_at`) untuk data penting.",
        ],
        dos: [
          "Isi audit field otomatis di service layer.",
          "Gunakan waktu server (UTC), bukan waktu client.",
        ],
        donts: [
          "Menghapus audit trail data kritis secara permanen tanpa kebijakan.",
          "Mengandalkan client untuk timestamp.",
        ],
        checklist: [
          "`created_at`/`updated_at` ada & UTC.",
          "`updated_at` diperbarui saat write.",
          "Kebijakan delete/soft-delete jelas.",
        ],
      },
    ],
  },

  {
    id: "data-access",
    title: "Data Access",
    icon: Layers3,
    summary:
      "Optimasi query, paginasi, batch processing, manajemen transaksi, dan konsistensi data.",
    topics: [
      {
        id: "query-optimization",
        title: "Query Optimization",
        principle:
          "Ambil hanya yang dibutuhkan. Query efisien memakai indeks, proyeksi, dan filter tepat sasaran.",
        rules: [
          "Filter di database, bukan di aplikasi.",
          "Proyeksikan hanya field yang diperlukan.",
          "Hindari N+1 query — batch/aggregate bila perlu.",
          "Manfaatkan indeks (lihat Index Management).",
        ],
        dos: [
          "Gunakan aggregation pipeline untuk transformasi berat.",
          "Ukur query lambat & perbaiki.",
        ],
        donts: [
          "Menarik seluruh koleksi lalu memfilter di memori.",
          "Query berulang dalam loop (N+1).",
        ],
        checklist: [
          "Filter & proyeksi di DB.",
          "Tidak ada N+1.",
          "Query panas ter-index.",
        ],
      },
      {
        id: "data-pagination",
        title: "Data Pagination",
        principle:
          "Jangan pernah mengembalikan list tak terbatas. Paginasi melindungi backend, jaringan, dan UI.",
        rules: [
          "Terapkan paginasi untuk endpoint list (limit + skip / cursor).",
          "Tetapkan batas maksimum page size.",
          "Kembalikan metadata (total, page, page_size) bila UI butuh.",
          "Cursor/keyset pagination untuk dataset sangat besar.",
        ],
        dos: [
          "Default page size wajar (mis. 10–50).",
          "Konsistenkan kontrak paginasi antar endpoint.",
        ],
        donts: [
          "Mengembalikan ribuan record tanpa batas.",
          "Deep offset pagination pada data raksasa.",
        ],
        checklist: [
          "Endpoint list terpaginasi.",
          "Ada batas maksimum.",
          "Kontrak paginasi konsisten.",
        ],
      },
      {
        id: "batch-processing",
        title: "Batch Processing",
        principle:
          "Operasi massal dilakukan dalam batch untuk efisiensi & ketahanan, bukan satu per satu.",
        rules: [
          "Gunakan bulk operation untuk insert/update/delete massal.",
          "Proses dalam chunk berukuran wajar untuk membatasi memori.",
          "Sediakan penanganan kegagalan parsial (laporkan item gagal).",
          "Idempotensi agar aman diulang.",
        ],
        dos: [
          "Gunakan bulk write / `insert_many`.",
          "Chunk data besar (mis. 500–1000 per batch).",
        ],
        donts: [
          "Loop query per item untuk operasi massal.",
          "Memuat seluruh dataset ke memori sekaligus.",
        ],
        checklist: [
          "Operasi massal memakai bulk.",
          "Ada chunking.",
          "Kegagalan parsial tertangani.",
        ],
      },
      {
        id: "transaction-management",
        title: "Transaction Management",
        principle:
          "Operasi yang harus atomik dibungkus transaksi — semua berhasil atau semua batal.",
        rules: [
          "Gunakan transaksi untuk perubahan multi-dokumen yang harus atomik.",
          "Jaga transaksi tetap singkat untuk mengurangi kontensi.",
          "Tangani rollback pada kegagalan.",
          "Untuk aksi lintas sistem, gunakan pola saga/kompensasi.",
        ],
        dos: [
          "Bungkus langkah terkait dalam satu transaksi.",
          "Uji jalur rollback.",
        ],
        donts: [
          "Transaksi berjalan lama menahan lock.",
          "Mengasumsikan multi-write pasti konsisten tanpa transaksi.",
        ],
        checklist: [
          "Perubahan atomik pakai transaksi.",
          "Rollback teruji.",
          "Transaksi singkat.",
        ],
      },
      {
        id: "data-consistency",
        title: "Data Consistency",
        principle:
          "Jaga integritas & konsistensi data di seluruh operasi; pahami trade-off konsistensi kuat vs eventual.",
        rules: [
          "Tegakkan invarian domain di service layer.",
          "Cegah race condition (mis. cek-lalu-tulis) dengan operasi atomik.",
          "Sinkronkan data denormal saat sumber berubah.",
          "Validasi ulang di server sebelum commit.",
        ],
        dos: [
          "Gunakan update atomik (`find_one_and_update`).",
          "Definisikan invarian & jaga di satu tempat.",
        ],
        donts: [
          "Membiarkan write bersaing merusak state.",
          "Mengandalkan urutan operasi client.",
        ],
        checklist: [
          "Invarian terjaga di server.",
          "Race condition dimitigasi.",
          "Data denormal tersinkron.",
        ],
      },
    ],
  },

  {
    id: "api",
    title: "API & Integration",
    icon: Plug,
    summary:
      "Desain API, versioning, validasi request, standarisasi response, autentikasi, otorisasi, rate limiting, dan manajemen integrasi.",
    topics: [
      {
        id: "api-design",
        title: "API Design",
        principle:
          "API konsisten, dapat diprediksi, dan berorientasi resource. Kontrak jelas mempermudah konsumen.",
        rules: [
          "Semua route backend diawali prefiks `/api` (aturan ingress).",
          "Gunakan resource berbentuk kata benda jamak (`/api/offices`).",
          "Petakan verb HTTP dengan benar (GET/POST/PUT/PATCH/DELETE).",
          "Status code sesuai makna (201 create, 204 no-content, 4xx/5xx).",
        ],
        dos: [
          "Rancang kontrak sebelum implementasi.",
          "Konsisten dalam penamaan & bentuk payload.",
        ],
        donts: [
          "Verb dalam URL (`/getOffices`).",
          "Route backend tanpa prefiks `/api`.",
        ],
        checklist: [
          "Semua route pakai `/api`.",
          "Resource-oriented & konsisten.",
          "Verb & status code tepat.",
        ],
        code: {
          language: "python",
          good: "@api_router.post(\"/offices\", status_code=201)\n@api_router.get(\"/offices\")\n@api_router.delete(\"/offices/{office_id}\")",
          bad: "@app.get(\"/getAllOffices\")   # tanpa /api, verb di URL",
        },
      },
      {
        id: "api-versioning",
        title: "API Versioning",
        principle:
          "Perubahan breaking tidak boleh mematahkan konsumen. Versi API secara eksplisit & kelola deprekasi.",
        rules: [
          "Gunakan versi eksplisit untuk breaking change (mis. `/api/v1`).",
          "Perubahan additive (non-breaking) tidak perlu naik versi.",
          "Dukung versi lama selama masa deprekasi yang diumumkan.",
          "Dokumentasikan perubahan di changelog API.",
        ],
        dos: [
          "Rencanakan strategi versi sejak awal.",
          "Umumkan timeline deprekasi.",
        ],
        donts: [
          "Mengubah kontrak diam-diam.",
          "Menghapus field tanpa deprekasi.",
        ],
        checklist: [
          "Breaking change → versi baru.",
          "Deprekasi diumumkan.",
          "Changelog API terjaga.",
        ],
      },
      {
        id: "request-validation",
        title: "Request Validation",
        principle:
          "Setiap request divalidasi terhadap schema sebelum diproses (lihat juga Input Validation).",
        rules: [
          "Gunakan Pydantic model untuk body/query/path.",
          "Tolak field tak dikenal sesuai kebijakan.",
          "Kembalikan 422 dengan detail field yang salah.",
          "Validasi tipe, batas, dan enum.",
        ],
        dos: [
          "Definisikan model request per endpoint.",
          "Pusatkan aturan validasi umum.",
        ],
        donts: [
          "Menerima `dict` mentah tanpa schema.",
          "Memvalidasi manual secara ad-hoc.",
        ],
        checklist: [
          "Ada model request per endpoint.",
          "Error 422 informatif.",
          "Validasi tipe & batas.",
        ],
      },
      {
        id: "response-standardization",
        title: "Response Standardization",
        principle:
          "Bentuk response konsisten di seluruh API — sukses maupun error — agar konsumen mudah menanganinya.",
        rules: [
          "Gunakan response_model untuk membentuk output.",
          "Format error konsisten (mis. `{ detail: ... }`).",
          "Jangan bocorkan internal (stack trace, query) di response.",
          "Sertakan metadata paginasi bila relevan.",
        ],
        dos: [
          "Standarkan envelope sukses & error.",
          "Serialisasi tanggal ke ISO 8601.",
        ],
        donts: [
          "Bentuk response berbeda-beda antar endpoint.",
          "Mengembalikan ObjectId/`_id`.",
        ],
        checklist: [
          "Response berbentuk konsisten.",
          "Error konsisten & aman.",
          "Tidak ada ObjectId bocor.",
        ],
      },
      {
        id: "authentication",
        title: "Authentication",
        principle:
          "Autentikasi memastikan 'siapa Anda'. Gunakan mekanisme teruji, jangan bikin sendiri.",
        rules: [
          "Gunakan solusi standar (JWT/OAuth2/session) — jangan roll-your-own crypto.",
          "Simpan hash password dengan algoritma kuat (bcrypt/argon2), bukan plaintext.",
          "Token punya masa berlaku & mekanisme refresh yang aman.",
          "Rahasia/kunci disimpan di environment, bukan di kode.",
        ],
        dos: [
          "Pakai library autentikasi mapan.",
          "Simpan token secara aman di client.",
        ],
        donts: [
          "Menyimpan password plaintext.",
          "Membuat skema token/crypto sendiri.",
        ],
        checklist: [
          "Password di-hash kuat.",
          "Token kedaluwarsa & bisa refresh.",
          "Secret dari environment.",
        ],
      },
      {
        id: "authorization",
        title: "Authorization",
        principle:
          "Otorisasi memastikan 'apa yang boleh Anda lakukan'. Terapkan least-privilege dan cek di server.",
        rules: [
          "Cek izin di server untuk setiap aksi terlindungi.",
          "Terapkan least privilege (default deny).",
          "Gunakan model peran/izin yang jelas (mis. RBAC).",
          "UI menyembunyikan/menonaktifkan aksi tapi server tetap otoritatif.",
        ],
        dos: [
          "Pusatkan pengecekan otorisasi.",
          "Ikuti pola Permission design system (Hide/Disable/Read-only/Forbidden).",
        ],
        donts: [
          "Mengandalkan penyembunyian UI sebagai keamanan.",
          "Memberi izin berlebih 'agar mudah'.",
        ],
        checklist: [
          "Otorisasi dicek di server.",
          "Least privilege diterapkan.",
          "Model peran/izin jelas.",
        ],
      },
      {
        id: "rate-limiting",
        title: "Rate Limiting",
        principle:
          "Batasi laju permintaan untuk melindungi dari penyalahgunaan, brute-force, dan lonjakan beban.",
        rules: [
          "Terapkan rate limit pada endpoint sensitif (login, reset, pencarian mahal).",
          "Kembalikan 429 dengan header `Retry-After`.",
          "Batasi per identitas (IP/user/API key).",
          "Bedakan limit publik vs terautentikasi.",
        ],
        dos: [
          "Lindungi endpoint auth dari brute-force.",
          "Log & pantau pelanggaran limit.",
        ],
        donts: [
          "Membiarkan endpoint mahal tanpa batas.",
          "Rate limit hanya di frontend.",
        ],
        checklist: [
          "Endpoint sensitif ter-limit.",
          "429 + Retry-After.",
          "Limit per identitas.",
        ],
      },
      {
        id: "integration-management",
        title: "Integration Management",
        principle:
          "Integrasi pihak ketiga harus tangguh terhadap kegagalan & terisolasi dari inti aplikasi.",
        rules: [
          "Bungkus panggilan eksternal dengan timeout, retry (backoff), dan circuit breaker.",
          "Simpan kredensial integrasi di environment.",
          "Isolasi SDK/klien di satu modul (jangan menyebar).",
          "Tangani degradasi anggun (fallback) saat layanan down.",
        ],
        dos: [
          "Timeout & retry untuk semua panggilan jaringan.",
          "Log korelasi untuk debugging integrasi.",
        ],
        donts: [
          "Memanggil API eksternal tanpa timeout.",
          "Menyebar SDK ke banyak lapisan.",
        ],
        checklist: [
          "Timeout & retry ada.",
          "Kredensial dari environment.",
          "Klien terisolasi & ada fallback.",
        ],
      },
    ],
  },

  {
    id: "security",
    title: "Security",
    icon: ShieldCheck,
    summary:
      "Validasi data aman, proteksi data sensitif, manajemen kredensial, keamanan file, sesi, security headers, serta sanitasi input & output.",
    topics: [
      {
        id: "secure-data-validation",
        title: "Secure Data Validation",
        principle:
          "Validasi berorientasi keamanan: anggap semua input berbahaya, whitelist yang diizinkan, tolak sisanya.",
        rules: [
          "Whitelist format/nilai yang diizinkan (bukan blacklist).",
          "Validasi ulang di server meski client sudah memvalidasi.",
          "Batasi ukuran & tipe payload.",
          "Cegah injeksi (NoSQL/command) lewat query berparameter/schema.",
        ],
        dos: [
          "Gunakan schema ketat (Pydantic/Zod).",
          "Tolak input yang tidak sesuai pola.",
        ],
        donts: [
          "Membangun query dari string input mentah.",
          "Mengandalkan validasi client saja.",
        ],
        checklist: [
          "Whitelist diterapkan.",
          "Validasi server wajib.",
          "Anti-injeksi diterapkan.",
        ],
      },
      {
        id: "sensitive-data-protection",
        title: "Sensitive Data Protection",
        principle:
          "Lindungi data sensitif/PII sepanjang siklus hidup: saat transit, saat diam, dan saat ditampilkan.",
        rules: [
          "Enkripsi in-transit (HTTPS/TLS) — wajib.",
          "Enkripsi/lindungi data sensitif at-rest bila perlu.",
          "Jangan log/return data sensitif.",
          "Terapkan masking pada tampilan (mis. sebagian nomor).",
        ],
        dos: [
          "Minimalkan pengumpulan data sensitif.",
          "Mask data saat ditampilkan.",
        ],
        donts: [
          "Menyimpan PII tanpa kebutuhan.",
          "Mengirim data sensitif dalam URL/query.",
        ],
        checklist: [
          "TLS aktif.",
          "Tidak ada sensitif di log/response.",
          "Masking di UI.",
        ],
      },
      {
        id: "credential-management",
        title: "Credential Management",
        principle:
          "Rahasia tidak pernah masuk source code atau version control. Kelola lewat environment/secret manager.",
        rules: [
          "Semua secret (API key, DB URL, token) di `.env`/secret manager.",
          "JANGAN commit `.env` atau hardcode secret.",
          "Rotasi kunci secara berkala & saat bocor.",
          "Batasi cakupan kunci (least privilege).",
        ],
        dos: [
          "Gunakan environment variable.",
          "Simpan `.env` di `.gitignore`.",
        ],
        donts: [
          "Menaruh kunci di repo/kode/log.",
          "Berbagi satu kunci super-akses ke semua.",
        ],
        checklist: [
          "Tidak ada secret di kode/repo.",
          "`.env` tidak di-commit.",
          "Ada kebijakan rotasi.",
        ],
      },
      {
        id: "file-security",
        title: "File Security",
        principle:
          "Upload & akses file adalah vektor serangan umum. Validasi ketat dan simpan dengan aman.",
        rules: [
          "Validasi tipe (MIME + ekstensi) dan ukuran maksimum.",
          "Simpan di luar webroot atau storage khusus; nama file di-sanitasi.",
          "Jangan pernah mengeksekusi file yang diunggah.",
          "Kontrol akses download (otorisasi + URL bertanda tangan bila perlu).",
        ],
        dos: [
          "Gunakan chunked upload untuk file besar.",
          "Buat nama file baru (mis. UUID) saat simpan.",
        ],
        donts: [
          "Mempercayai nama/tipe file dari client.",
          "Menyajikan direktori upload secara publik tanpa kontrol.",
        ],
        checklist: [
          "Tipe & ukuran divalidasi.",
          "Nama file di-sanitasi.",
          "Akses download terotorisasi.",
        ],
      },
      {
        id: "session-management",
        title: "Session Management",
        principle:
          "Sesi/token dikelola aman: singkat, dapat dicabut, dan terlindung dari pencurian.",
        rules: [
          "Cookie sesi: `HttpOnly`, `Secure`, `SameSite`.",
          "Sesi/token punya masa berlaku & idle timeout.",
          "Regenerasi id sesi setelah login (cegah fixation).",
          "Sediakan logout yang benar-benar mencabut sesi.",
        ],
        dos: [
          "Simpan token di penyimpanan aman.",
          "Cabut token saat logout/berubah kredensial.",
        ],
        donts: [
          "Sesi tak pernah kedaluwarsa.",
          "Menyimpan token sensitif di localStorage tanpa pertimbangan.",
        ],
        checklist: [
          "Cookie HttpOnly/Secure/SameSite.",
          "Ada timeout & revocation.",
          "Regenerasi id saat login.",
        ],
      },
      {
        id: "security-headers",
        title: "Security Headers",
        principle:
          "Header keamanan HTTP memberi lapisan pertahanan tambahan terhadap serangan umum.",
        rules: [
          "Terapkan HSTS untuk memaksa HTTPS.",
          "Set `X-Content-Type-Options: nosniff` & `X-Frame-Options`/frame-ancestors.",
          "Terapkan Content Security Policy (CSP) sesuai kebutuhan.",
          "Konfigurasi CORS secara ketat (origin diizinkan spesifik).",
        ],
        dos: [
          "Aktifkan header keamanan di layer server/proxy.",
          "Batasi CORS ke origin yang dikenal.",
        ],
        donts: [
          "CORS `*` untuk endpoint sensitif.",
          "Mengabaikan CSP sepenuhnya.",
        ],
        checklist: [
          "HSTS & nosniff aktif.",
          "CSP terkonfigurasi.",
          "CORS ketat.",
        ],
      },
      {
        id: "input-output-sanitization",
        title: "Input & Output Sanitization",
        principle:
          "Sanitasi input mencegah injeksi; encoding output mencegah XSS. Keduanya wajib.",
        rules: [
          "Escape/encode output sesuai konteks (HTML/attr/URL/JS).",
          "React meng-escape teks secara default — hindari `dangerouslySetInnerHTML`.",
          "Sanitasi HTML dari sumber tak tepercaya bila harus dirender.",
          "Gunakan query berparameter/schema untuk mencegah injeksi.",
        ],
        dos: [
          "Andalkan escaping default framework.",
          "Sanitasi HTML dengan library tepercaya bila perlu.",
        ],
        donts: [
          "`dangerouslySetInnerHTML` dari input pengguna.",
          "Menggabung string input ke query/perintah.",
        ],
        checklist: [
          "Output ter-encode sesuai konteks.",
          "Tidak ada HTML mentah dari user.",
          "Anti-injeksi diterapkan.",
        ],
      },
    ],
  },

  {
    id: "performance",
    title: "Performance",
    icon: Gauge,
    summary:
      "Strategi caching, optimasi resource, background processing, lazy loading, dan monitoring performa.",
    topics: [
      {
        id: "caching-strategy",
        title: "Caching Strategy",
        principle:
          "Cache mengurangi kerja berulang, tetapi menambah kompleksitas invalidasi. Cache yang tepat sasaran & punya kebijakan kadaluarsa jelas.",
        rules: [
          "Cache data mahal & sering dibaca dengan TTL yang tepat.",
          "Tentukan strategi invalidasi saat data berubah.",
          "Gunakan cache berlapis (client/CDN/server) sesuai kebutuhan.",
          "Hindari cache data sensitif/per-user di layer bersama.",
        ],
        dos: [
          "Tetapkan TTL & key cache yang jelas.",
          "Invalidasi saat write terkait.",
        ],
        donts: [
          "Cache tanpa strategi invalidasi.",
          "Cache data usang yang menyesatkan.",
        ],
        checklist: [
          "TTL & key terdefinisi.",
          "Invalidasi jelas.",
          "Tidak cache data sensitif salah tempat.",
        ],
      },
      {
        id: "resource-optimization",
        title: "Resource Optimization",
        principle:
          "Hemat CPU, memori, jaringan, dan ukuran bundel. Kecepatan adalah fitur.",
        rules: [
          "Frontend: code splitting, minifikasi, kompresi asset & gambar.",
          "Backend: hindari kerja/alokasi tak perlu di jalur panas.",
          "Kurangi ukuran payload (proyeksi field, paginasi).",
          "Gunakan koneksi/pool yang efisien.",
        ],
        dos: [
          "Optimalkan ukuran & format gambar.",
          "Pantau ukuran bundel frontend.",
        ],
        donts: [
          "Mengirim payload besar tak perlu.",
          "Memuat semua kode di awal.",
        ],
        checklist: [
          "Asset teroptimasi.",
          "Payload minimal.",
          "Bundel terpantau.",
        ],
      },
      {
        id: "background-processing",
        title: "Background Processing",
        principle:
          "Pekerjaan berat/lambat dijalankan asinkron di latar belakang agar request tetap responsif.",
        rules: [
          "Pindahkan tugas lama (email, laporan, olah data) ke background/queue.",
          "Buat tugas idempoten & bisa di-retry.",
          "Beri visibilitas status tugas ke pengguna bila perlu.",
          "Batasi konkurensi agar tidak membanjiri sumber daya.",
        ],
        dos: [
          "Gunakan task queue / worker.",
          "Laporkan progres tugas panjang.",
        ],
        donts: [
          "Memblokir request HTTP untuk kerja berat.",
          "Tugas background tanpa penanganan gagal.",
        ],
        checklist: [
          "Kerja berat di background.",
          "Idempoten & retryable.",
          "Konkurensi terbatas.",
        ],
      },
      {
        id: "lazy-loading",
        title: "Lazy Loading",
        principle:
          "Muat resource saat dibutuhkan saja untuk mempercepat waktu muat awal.",
        rules: [
          "Frontend: lazy-load rute/komponen berat (code splitting).",
          "Lazy-load gambar & konten di bawah lipatan (below the fold).",
          "Backend: muat relasi/data hanya saat diperlukan.",
          "Virtualisasi list/tabel sangat panjang.",
        ],
        dos: [
          "Gunakan dynamic import untuk halaman besar.",
          "Virtualisasi tabel besar.",
        ],
        donts: [
          "Memuat seluruh dataset ke UI sekaligus.",
          "Eager-load semua modul di awal.",
        ],
        checklist: [
          "Rute berat di-split.",
          "Gambar lazy-load.",
          "List panjang tervirtualisasi.",
        ],
      },
      {
        id: "performance-monitoring",
        title: "Performance Monitoring",
        principle:
          "Yang tidak diukur tidak bisa dioptimalkan. Pantau metrik performa secara berkelanjutan.",
        rules: [
          "Lacak latensi (p50/p95/p99) endpoint kritis.",
          "Pantau throughput, error rate, dan resource (CPU/mem).",
          "Frontend: pantau Core Web Vitals (LCP/CLS/INP).",
          "Tetapkan baseline & alert saat regresi.",
        ],
        dos: [
          "Ukur sebelum & sesudah optimasi.",
          "Set alert ambang batas.",
        ],
        donts: [
          "Optimasi tanpa data (tebak-tebakan).",
          "Mengabaikan regresi performa.",
        ],
        checklist: [
          "Latensi p95/p99 terpantau.",
          "Core Web Vitals terpantau.",
          "Ada baseline & alert.",
        ],
      },
    ],
  },

  {
    id: "file-management",
    title: "File Management",
    icon: FolderTree,
    summary:
      "Organisasi file, penamaan, validasi, dan retensi/penghapusan file terkelola.",
    topics: [
      {
        id: "file-organization",
        title: "File Organization",
        principle:
          "File disimpan terstruktur & dapat diprediksi, terpisah dari kode aplikasi, di storage persisten.",
        rules: [
          "Gunakan struktur direktori bermakna (mis. per tanggal/entitas).",
          "Simpan di lokasi persisten khusus, bukan tercampur source.",
          "Simpan metadata file (pemilik, ukuran, tipe, waktu) di database.",
          "Pisahkan file publik vs privat.",
        ],
        dos: [
          "Referensikan file lewat metadata di DB.",
          "Gunakan storage yang tahan restart.",
        ],
        donts: [
          "Menaruh upload di dalam folder kode/webroot.",
          "Kehilangan jejak metadata file.",
        ],
        checklist: [
          "Struktur direktori jelas.",
          "Metadata tersimpan di DB.",
          "Publik/privat terpisah.",
        ],
      },
      {
        id: "file-naming",
        title: "File Naming",
        principle:
          "Nama file aman, unik, dan tidak bergantung pada input pengguna mentah.",
        rules: [
          "Generate nama unik (mis. UUID) saat penyimpanan.",
          "Sanitasi nama asli; simpan sebagai metadata terpisah.",
          "Cegah path traversal (`../`) & karakter berbahaya.",
          "Simpan ekstensi hanya setelah validasi tipe.",
        ],
        dos: [
          "Pakai UUID untuk nama fisik.",
          "Simpan `original_name` di metadata.",
        ],
        donts: [
          "Memakai nama file dari user apa adanya.",
          "Mengizinkan karakter path di nama.",
        ],
        checklist: [
          "Nama fisik unik/aman.",
          "Anti path traversal.",
          "Nama asli sebagai metadata.",
        ],
      },
      {
        id: "file-validation",
        title: "File Validation",
        principle:
          "Validasi file sebelum diterima: tipe, ukuran, dan konten, untuk mencegah abuse & malware.",
        rules: [
          "Batasi ukuran maksimum & tipe yang diizinkan (whitelist).",
          "Verifikasi MIME/magic bytes, bukan hanya ekstensi.",
          "Tolak file berbahaya/dapat dieksekusi.",
          "Pindai malware bila konteks menuntut.",
        ],
        dos: [
          "Whitelist tipe file.",
          "Cek magic bytes.",
        ],
        donts: [
          "Percaya ekstensi/`Content-Type` dari client.",
          "Menerima file tanpa batas ukuran.",
        ],
        checklist: [
          "Tipe & ukuran divalidasi.",
          "Magic bytes dicek.",
          "File berbahaya ditolak.",
        ],
      },
      {
        id: "file-retention",
        title: "File Retention",
        principle:
          "File punya siklus hidup: simpan sesuai kebutuhan, bersihkan yang tak terpakai sesuai kebijakan.",
        rules: [
          "Tetapkan kebijakan retensi & masa simpan.",
          "Bersihkan file yatim (tak lagi direferensikan).",
          "Pertimbangkan soft-delete + purge terjadwal untuk file penting.",
          "Patuhi regulasi retensi data bila berlaku.",
        ],
        dos: [
          "Jadwalkan pembersihan file yatim.",
          "Dokumentasikan kebijakan retensi.",
        ],
        donts: [
          "Menyimpan file selamanya tanpa kebijakan.",
          "Menghapus permanen tanpa jejak/persetujuan.",
        ],
        checklist: [
          "Ada kebijakan retensi.",
          "File yatim dibersihkan.",
          "Kepatuhan regulasi terpenuhi.",
        ],
      },
    ],
  },

  {
    id: "monitoring",
    title: "Monitoring",
    icon: Activity,
    summary:
      "Application logging, audit logging, error monitoring, health monitoring, dan performance metrics.",
    topics: [
      {
        id: "application-logging",
        title: "Application Logging",
        principle:
          "Log aplikasi memberi visibilitas perilaku sistem. Terstruktur, ber-level, dan aman.",
        rules: [
          "Gunakan logging terstruktur (key-value/JSON) dengan level.",
          "Sertakan konteks korelasi (request id).",
          "Jangan log rahasia/PII (lihat Logging & Sensitive Data).",
          "Kelola volume & rotasi log.",
        ],
        dos: [
          "Standarkan format log.",
          "Korelasikan log lintas layanan.",
        ],
        donts: [
          "`print`/`console.log` sebagai logging produksi.",
          "Log tak terstruktur yang sulit dicari.",
        ],
        checklist: [
          "Log terstruktur & ber-level.",
          "Ada request id.",
          "Tidak ada rahasia di log.",
        ],
      },
      {
        id: "audit-logging",
        title: "Audit Logging",
        principle:
          "Audit log mencatat siapa melakukan apa & kapan atas data/aksi penting — untuk akuntabilitas & forensik.",
        rules: [
          "Catat aksi sensitif (create/update/delete, login, perubahan izin).",
          "Sertakan aktor, aksi, target, waktu (UTC), dan hasil.",
          "Audit log bersifat append-only & terlindungi.",
          "Simpan sesuai kebijakan retensi/kepatuhan.",
        ],
        dos: [
          "Pisahkan audit log dari log aplikasi biasa.",
          "Jadikan immutable/append-only.",
        ],
        donts: [
          "Mengizinkan penghapusan/pengubahan audit log.",
          "Melewatkan aksi kritikal dari audit.",
        ],
        checklist: [
          "Aksi sensitif teraudit.",
          "Berisi aktor/aksi/target/waktu.",
          "Append-only & retensi jelas.",
        ],
      },
      {
        id: "error-monitoring",
        title: "Error Monitoring",
        principle:
          "Error ditangkap, diagregasi, dan ditindaklanjuti — bukan sekadar tercetak lalu hilang.",
        rules: [
          "Kumpulkan error terpusat (mis. Sentry) dengan stack & konteks.",
          "Agregasi & deduplikasi untuk temukan pola.",
          "Set alert untuk error kritis/lonjakan.",
          "Kaitkan error dengan rilis/versi.",
        ],
        dos: [
          "Tangkap error backend & frontend.",
          "Triase & tetapkan prioritas.",
        ],
        donts: [
          "Membiarkan error tenggelam di log.",
          "Alert lelah (terlalu banyak noise).",
        ],
        checklist: [
          "Error terkumpul terpusat.",
          "Ada alert kritis.",
          "Terkait versi rilis.",
        ],
      },
      {
        id: "health-monitoring",
        title: "Health Monitoring",
        principle:
          "Sistem mengekspos kesehatannya agar orkestrator & tim tahu status secara real-time.",
        rules: [
          "Sediakan health/readiness endpoint (mis. `/api/health`).",
          "Periksa dependensi vital (database, layanan eksternal).",
          "Bedakan liveness vs readiness.",
          "Set alert saat health gagal.",
        ],
        dos: [
          "Buat health check ringan & cepat.",
          "Cek koneksi DB pada readiness.",
        ],
        donts: [
          "Health check yang selalu 200 tanpa cek nyata.",
          "Mengabaikan status dependensi.",
        ],
        checklist: [
          "Health/readiness endpoint ada.",
          "Dependensi vital dicek.",
          "Alert saat gagal.",
        ],
      },
      {
        id: "performance-metrics",
        title: "Performance Metrics",
        principle:
          "Metrik kuantitatif (RED/USE) memandu keputusan kapasitas & optimasi.",
        rules: [
          "Lacak Rate, Errors, Duration (RED) untuk layanan.",
          "Lacak Utilization, Saturation, Errors (USE) untuk resource.",
          "Ekspos metrik dalam format standar (mis. Prometheus).",
          "Visualisasikan di dashboard & tetapkan SLO.",
        ],
        dos: [
          "Definisikan SLI/SLO.",
          "Dashboard metrik kunci.",
        ],
        donts: [
          "Mengumpulkan metrik tanpa dipakai.",
          "Tidak punya target (SLO).",
        ],
        checklist: [
          "Metrik RED/USE tersedia.",
          "Ada dashboard & SLO.",
          "Metrik dalam format standar.",
        ],
      },
    ],
  },

  {
    id: "backup-recovery",
    title: "Backup & Recovery",
    icon: DatabaseBackup,
    summary:
      "Strategi backup data, prosedur pemulihan, dan verifikasi backup.",
    topics: [
      {
        id: "data-backup",
        title: "Data Backup",
        principle:
          "Backup melindungi dari kehilangan data. Ikuti aturan 3-2-1 dan otomatiskan.",
        rules: [
          "Terapkan 3-2-1 (3 salinan, 2 media, 1 off-site).",
          "Backup terjadwal & otomatis (full + incremental).",
          "Enkripsi backup, terutama yang off-site.",
          "Tetapkan RPO (seberapa banyak data boleh hilang).",
        ],
        dos: [
          "Otomatiskan jadwal backup.",
          "Enkripsi & simpan off-site.",
        ],
        donts: [
          "Backup manual sesekali tanpa jadwal.",
          "Menyimpan backup hanya di satu tempat.",
        ],
        checklist: [
          "Backup otomatis & terjadwal.",
          "Terenkripsi & off-site.",
          "RPO ditetapkan.",
        ],
      },
      {
        id: "recovery-procedure",
        title: "Recovery Procedure",
        principle:
          "Backup tidak berguna tanpa pemulihan yang teruji. Prosedur restore harus jelas & terlatih.",
        rules: [
          "Dokumentasikan langkah restore step-by-step (runbook).",
          "Tetapkan RTO (target waktu pemulihan).",
          "Latih drill pemulihan secara berkala.",
          "Tentukan peran & eskalasi saat insiden.",
        ],
        dos: [
          "Simpan runbook yang mudah diakses.",
          "Latih tim melakukan restore.",
        ],
        donts: [
          "Mengasumsikan restore pasti berhasil.",
          "Prosedur hanya di kepala satu orang.",
        ],
        checklist: [
          "Runbook restore ada.",
          "RTO ditetapkan.",
          "Drill dilakukan berkala.",
        ],
      },
      {
        id: "backup-verification",
        title: "Backup Verification",
        principle:
          "Backup yang tidak terverifikasi = tidak ada backup. Uji integritas & keterpulihan secara rutin.",
        rules: [
          "Verifikasi integritas backup (checksum) setelah dibuat.",
          "Lakukan test-restore berkala ke lingkungan terpisah.",
          "Pantau keberhasilan/kegagalan job backup + alert.",
          "Catat hasil verifikasi.",
        ],
        dos: [
          "Test-restore terjadwal.",
          "Alert saat backup gagal.",
        ],
        donts: [
          "Menganggap job sukses tanpa cek isi.",
          "Tak pernah mencoba restore.",
        ],
        checklist: [
          "Integritas diverifikasi.",
          "Test-restore rutin.",
          "Kegagalan ter-alert.",
        ],
      },
    ],
  },

  {
    id: "documentation",
    title: "Documentation",
    icon: BookOpen,
    summary:
      "Dokumentasi arsitektur, database, API, dan perubahan (changelog) yang hidup & terjaga.",
    topics: [
      {
        id: "architecture-documentation",
        title: "Architecture Documentation",
        principle:
          "Dokumentasi arsitektur menjelaskan komponen, alur, dan keputusan penting agar tim cepat paham & selaras.",
        rules: [
          "Pelihara `ARCHITECTURE.md` (komponen, alur data, integrasi).",
          "Sertakan diagram tingkat tinggi bila membantu.",
          "Catat keputusan penting (ADR) beserta alasannya.",
          "Perbarui saat arsitektur berubah.",
        ],
        dos: [
          "Dokumentasikan 'mengapa', bukan hanya 'apa'.",
          "Tautkan ke SSOT terkait.",
        ],
        donts: [
          "Membiarkan dokumen usang.",
          "Menyimpan pengetahuan hanya lisan.",
        ],
        checklist: [
          "`ARCHITECTURE.md` terjaga.",
          "Keputusan tercatat (ADR).",
          "Diperbarui saat berubah.",
        ],
      },
      {
        id: "database-documentation",
        title: "Database Documentation",
        principle:
          "Struktur data terdokumentasi: koleksi, field, tipe, relasi, indeks, dan constraint.",
        rules: [
          "Dokumentasikan setiap koleksi & field (tipe, wajib, makna).",
          "Jelaskan relasi & kebijakan delete.",
          "Catat indeks & constraint (unique).",
          "Selaraskan dengan implementasi (single source).",
        ],
        dos: [
          "Sertakan contoh dokumen.",
          "Perbarui saat skema berubah.",
        ],
        donts: [
          "Dokumen skema berbeda dari kenyataan.",
          "Melewatkan indeks/constraint.",
        ],
        checklist: [
          "Koleksi & field terdokumentasi.",
          "Relasi & indeks dijelaskan.",
          "Selaras dengan implementasi.",
        ],
      },
      {
        id: "api-documentation",
        title: "API Documentation",
        principle:
          "API terdokumentasi jelas: endpoint, parameter, request/response, error, dan autentikasi.",
        rules: [
          "Manfaatkan OpenAPI/Swagger otomatis (FastAPI `/docs`).",
          "Deskripsikan setiap endpoint, parameter, & kode error.",
          "Sertakan contoh request/response.",
          "Perbarui bersama perubahan kode (dokumen hidup).",
        ],
        dos: [
          "Gunakan model & docstring agar OpenAPI kaya.",
          "Dokumentasikan skema error.",
        ],
        donts: [
          "Endpoint tanpa deskripsi/contoh.",
          "Dokumen API tertinggal dari kode.",
        ],
        checklist: [
          "OpenAPI tersedia & akurat.",
          "Contoh & error terdokumentasi.",
          "Sinkron dengan kode.",
        ],
      },
      {
        id: "change-documentation",
        title: "Change Documentation",
        principle:
          "Perubahan tercatat rapi (changelog + commit + PR) agar riwayat & dampak dapat dilacak.",
        rules: [
          "Pelihara CHANGELOG mengikuti SemVer & 'Keep a Changelog'.",
          "Pesan commit deskriptif (mis. Conventional Commits).",
          "PR menjelaskan konteks, perubahan, & dampak.",
          "Tandai breaking change & migrasi.",
        ],
        dos: [
          "Kelompokkan perubahan (Added/Changed/Fixed/Removed).",
          "Rujuk isu/tiket terkait.",
        ],
        donts: [
          "Commit 'update' tanpa konteks.",
          "Breaking change tanpa catatan.",
        ],
        checklist: [
          "CHANGELOG terjaga.",
          "Commit/PR deskriptif.",
          "Breaking change ditandai.",
        ],
      },
    ],
  },
];

/** Peta id → group untuk lookup cepat di renderer. */
export const guidelineGroupById = Object.fromEntries(
  guidelineGroups.map((g) => [g.id, g]),
);

/** Ringkas jumlah topik untuk badge/overview. */
export const totalTopics = guidelineGroups.reduce(
  (sum, g) => sum + g.topics.length,
  0,
);
