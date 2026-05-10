# MENTARI CLI

> LMS Auto-Pilot CLI v2.0 — Otomasi tugas, absensi, dan forum diskusi di LMS Mentari UNPAM berbasis AI Gemini.

```
███╗   ███╗███████╗███╗   ██╗████████╗ █████╗ ██████╗ ██╗     ██████╗██╗     ██╗
████╗ ████║██╔════╝████╗  ██║╚══██╔══╝██╔══██╗██╔══██╗██║    ██╔════╝██║     ██║
██╔████╔██║█████╗  ██╔██╗ ██║   ██║   ███████║██████╔╝██║    ██║     ██║     ██║
██║╚██╔╝██║██╔══╝  ██║ ██╗██║   ██║   ██╔══██║██╔══██╗██║    ██║     ██║     ██║
██║ ╚═╝ ██║███████╗██║  ╚████║   ██║   ██║  ██║██║  ██║██║    ╚██████╗███████╗██║
╚═╝     ╚═╝╚══════╝╚═╝   ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═════╝╚══════╝╚═╝
```

---

## Daftar Isi

- [Tentang](#tentang)
- [Fitur](#fitur)
- [Prasyarat](#prasyarat)
- [Instalasi](#instalasi)
- [Konfigurasi](#konfigurasi)
- [Cara Penggunaan](#cara-penggunaan)
  - [Login](#login)
  - [Menu Utama](#menu-utama)
  - [Scan Tugas Pending](#scan-tugas-pending)
  - [Auto-Pilot Eksekusi](#auto-pilot-eksekusi)
  - [Chat Bot Asisten AI](#chat-bot-asisten-ai)
  - [Ganti Model AI](#ganti-model-ai)
- [Struktur Project](#struktur-project)
- [Alur Teknis](#alur-teknis)
- [Catatan Penting](#catatan-penting)

---

## Tentang

MENTARI CLI adalah tools otomasi berbasis Node.js untuk mahasiswa UNPAM yang menggunakan LMS Mentari. CLI ini mengotomasi pekerjaan berulang seperti mengerjakan pre-test, post-test, forum diskusi, dan mengisi kuesioner absensi — semuanya dibantu oleh AI Gemini.

Login dilakukan melalui browser Chromium yang dibuka otomatis (via Puppeteer), sehingga Cloudflare tidak memblokir akses. Semua request API dijalankan dari dalam browser yang sama untuk memastikan sesi tetap valid.

---

## Fitur

| Fitur | Deskripsi |
|-------|-----------|
| **Login Otomatis** | Browser terbuka, user login manual, token ditangkap otomatis |
| **Scan Tugas Pending** | Cek semua mata kuliah dan tampilkan pertemuan yang belum tuntas |
| **Auto-Pilot Pre-Test** | Kerjakan pre-test secara otomatis dengan jawaban dari AI |
| **Auto-Pilot Forum Diskusi** | Generate dan kirim 2x balasan forum diskusi via AI |
| **Auto-Pilot Post-Test** | Kerjakan post-test secara otomatis dengan jawaban dari AI |
| **Auto-Pilot Kuesioner** | Submit kuesioner absensi otomatis |
| **Eksekusi Penuh** | Jalankan semua tahap sekaligus dalam satu klik |
| **Chat Bot AI** | Tanya jawab dengan AI Gemini langsung dari CLI |
| **Ganti Model AI** | Pilih model Gemini yang tersedia sesuai quota |
| **Discovery Mode** | Sniff endpoint API Mentari langsung dari browser |
| **Auto-Reauth** | Token expired otomatis meminta login ulang tanpa restart |

---

## Prasyarat

- **Node.js** v18 atau lebih baru — [nodejs.org](https://nodejs.org)
- **Google Chrome** atau Microsoft Edge — sudah terinstall di device
- **Akun Gemini AI Studio** untuk API key gratis — [aistudio.google.com](https://aistudio.google.com/app/apikey)
- Akun mahasiswa aktif di LMS Mentari UNPAM

> CLI menggunakan Chrome/Edge yang sudah ada di device kamu — tidak perlu download browser tambahan.

---

## Instalasi

### Via npm (Direkomendasikan)

```bash
npm install -g mentari-cli
```

Setelah install, jalankan dari mana saja:

```bash
mentari
```

> Instalasi ringan — tidak download browser tambahan. CLI otomatis menggunakan Google Chrome atau Microsoft Edge yang sudah ada di device kamu.

### Update ke Versi Terbaru

```bash
npm update -g mentari-cli
```

### Via Clone (Development)

```bash
git clone <repo-url>
cd mentari-cli
npm install
node src/index.js
```

---

## Update ke Versi Terbaru

```bash
npm update -g mentari-cli
```

---

## Konfigurasi

Tidak perlu setup manual apapun. Semua konfigurasi dikelola otomatis oleh CLI:

- **Token LMS** — ditangkap otomatis saat login via browser
- **Gemini API Key** — dimasukkan sekali saat pertama kali jalan, disimpan otomatis
- **Model AI** — dideteksi otomatis dari API key yang dimasukkan

File `.env` dibuat dan dikelola sendiri oleh CLI di background. User tidak perlu menyentuhnya.

---

## Cara Penggunaan

### Menjalankan CLI

```bash
node src/index.js
```

---

### Setup Pertama Kali

Saat pertama kali dijalankan, CLI akan melakukan dua setup otomatis:

#### 1. Setup Gemini API Key

```
┌─ SETUP GEMINI API KEY ──────────────────────────────────────┐
│  Dapatkan API Key gratis di:                                │
│  https://aistudio.google.com/app/apikey                     │
│  Key hanya perlu dimasukkan sekali dan disimpan otomatis.   │
└─────────────────────────────────────────────────────────────┘

⟶ Masukkan Gemini API Key: ****************************
ⓘ Mendeteksi model yang tersedia...
✓ API Key valid! Model terdeteksi: gemini-2.5-flash
```

Buka [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey), buat API key gratis, lalu paste ke CLI. Key disimpan permanen — tidak perlu dimasukkan lagi di sesi berikutnya.

#### 2. Login LMS Mentari

```
┌─ AUTENTIKASI MENTARI CLI ──────────────────────────────────┐
│  ▶ Browser akan terbuka otomatis                           │
│  ▶ Login dengan NIM dan password seperti biasa             │
│  ▶ CLI otomatis mendeteksi token setelah login             │
│  Browser tetap terbuka di background untuk bypass CF       │
└────────────────────────────────────────────────────────────┘
```

Browser Chromium terbuka otomatis → login dengan NIM dan password → CLI menangkap token secara otomatis. Tidak perlu copy-paste apapun.

> **Penting:** Jangan tutup browser Chromium yang terbuka. Browser ini dipakai untuk semua request API agar tidak diblokir Cloudflare.

---

### Menu Utama

```
┌─ MENU UTAMA ──────────────────────────────────────────────────┐
│                                                               │
│  ● Scan Tugas Pending       • Cek status tugas dan absensi   │
│                                                               │
│  ● Auto-Pilot Eksekusi      • Otomasi selesaikan tugas       │
│                                                               │
│  ● Chat Bot Asisten AI      • Tanya ke AI Gemini             │
│                                                               │
│  ● Ganti Model AI           • Pilih model Gemini lain        │
│                                                               │
│  ● Keluar                   • Tutup aplikasi                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### Scan Tugas Pending

Memindai semua mata kuliah dan menampilkan pertemuan yang belum tuntas (forum ada tapi kuesioner belum diisi).

Output contoh:
```
┌─ MATA KULIAH: [2] KERJA PRAKTEK # 06TPLP017 ─┐
│  Kode: 20252-06TPLP017-22TIF0332             │
└───────────────────────────────────────────────┘
⚠ [PENDING] PERTEMUAN 1
  └● Pretest   : ✔ Selesai
  └● Forum     : ✗ Belum / Kurang Reply
  └● Posttest  : ✗ Belum
  └● Kuesioner : ✗ Belum (Absensi Belum Masuk)
```

---

### Auto-Pilot Eksekusi

Pilih mata kuliah dan pertemuan, lalu pilih tahap yang ingin dieksekusi:

```
┌─ AUTO-PILOT • [2] KERJA PRAKTEK ─────────────┐
│  Pertemuan 5                                  │
│  Pilih tahap yang ingin dieksekusi:           │
└───────────────────────────────────────────────┘

● [1] Pre-Test
● [2] Forum Diskusi
● [3] Post-Test
● [4] Kuesioner / Absensi
────────────────────────────────────────
▶ Eksekusi Semua Tahap Sekaligus
────────────────────────────────────────
ⓘ Discovery Mode (cari endpoint API)
────────────────────────────────────────
└ Kembali ke Menu Utama
```

#### Urutan Eksekusi yang Benar

LMS Mentari memiliki prasyarat berurutan:

```
Pre-Test → Forum Diskusi → Post-Test → Kuesioner
```

Setiap tahap hanya bisa dikerjakan setelah tahap sebelumnya selesai.

#### Discovery Mode

Jika ada tahap yang gagal karena endpoint API berubah, gunakan Discovery Mode:

1. Browser akan membuka halaman pertemuan
2. Klik modul yang ingin di-sniff (Pretest, Kuesioner, Forum, dll)
3. CLI menangkap semua request dan response API selama 90 detik
4. Endpoint yang valid akan ditampilkan

---

### Chat Bot Asisten AI

Chat langsung dengan AI Gemini dari dalam CLI:

```
┌─ CHAT BOT ASISTEN AI ──────────────────────────┐
│  Model  : gemini-2.5-flash                     │
│  ketik "/model" untuk ganti  •  "keluar" balik │
└────────────────────────────────────────────────┘

❯ apa itu LMS Mentari?

┌─ Bot ──────────────────────────────────────────┐
│ LMS Mentari adalah platform pembelajaran       │
│ daring milik Universitas Pamulang (UNPAM)      │
│ yang digunakan untuk perkuliahan online.       │
└────────────────────────────────────────────────┘
```

Perintah khusus di dalam chat:
- `keluar` — kembali ke menu utama
- `/model` — ganti model AI tanpa keluar dari chat

---

### Ganti Model AI

Menampilkan semua model Gemini yang tersedia untuk API key kamu beserta status quota-nya:

```
● gemini-2.5-pro        ● tersedia
● gemini-2.5-flash      ● tersedia  ← aktif
● gemini-2.0-flash      ⚠ quota habis
● gemini-2.0-flash-lite ⚠ quota habis
↩ Batal
```

Model yang dipilih disimpan ke `.env` dan dipakai untuk semua fitur AI (quiz, forum, chat).

---

## Struktur Project

```
mentari-cli/
├── src/
│   ├── index.js              # Entry point, menu utama, loop aplikasi
│   ├── api/
│   │   ├── client.js         # HTTP client (Node.js fetch + Puppeteer fallback)
│   │   ├── browser-client.js # Puppeteer page instance & fetch via browser
│   │   └── lms.js            # Helper API LMS (unused/legacy)
│   ├── services/
│   │   ├── auth.js           # Login via Puppeteer + input manual fallback
│   │   ├── gemini.js         # Setup API key, deteksi model, switch model
│   │   ├── ai.js             # Jawaban kuis & forum via Gemini
│   │   ├── chat.js           # Chat bot dengan conversation history
│   │   ├── autopilot.js      # Eksekusi pre-test, forum, post-test, kuesioner
│   │   └── scanner.js        # Scan tugas pending semua mata kuliah
│   └── utils/
│       ├── ui.js             # Komponen UI: box, bubble chat, warna, simbol
│       └── helpers.js        # Helper umum
├── .env                      # Token & config (auto-generated)
├── package.json
└── README.md
```

---

## Alur Teknis

### Autentikasi

```
node src/index.js
    │
    ├─ Cek .env → ada BEARER_TOKEN?
    │   ├─ Ya  → coba request ke /user-course
    │   │         ├─ 200 OK → lanjut ke menu
    │   │         └─ 403    → buka browser login
    │   └─ Tidak → buka browser login
    │
    └─ Browser Login (Puppeteer)
        ├─ Buka mentari.unpam.ac.id
        ├─ User login manual (CF happy)
        ├─ Intercept Authorization header dari network request
        ├─ Simpan token ke .env + process.env
        └─ Browser tetap terbuka → setBrowserPage()
```

### Request API

```
fetchMentari(endpoint)
    │
    ├─ hasBrowserPage() = true?
    │   └─ fetchViaBrowser() → page.evaluate(fetch) → CF bypass ✓
    │
    └─ hasBrowserPage() = false?
        └─ fetchNode() → Node.js fetch → mungkin kena CF ✗
```

### Auto-Pilot Quiz

```
eksekusiKuis(idModul)
    │
    ├─ PUT /quiz/start/{id}     → buka sesi quiz
    ├─ GET /quiz/soal/{id}      → ambil daftar soal
    ├─ Loop setiap soal:
    │   └─ AI Gemini → pilih jawaban terbaik
    │   └─ PUT /quiz/jawab      → kirim jawaban
    └─ PUT /quiz/end            → selesaikan quiz
```

### Auto-Pilot Kuesioner

```
eksekusiKuesioner()
    │
    ├─ GET /kuesioner/{kode}/{section}  → ambil pertanyaan
    └─ POST /kuesioner/submit           → kirim semua jawaban (nilai 1 = Sangat Setuju)
```

---

## Catatan Penting

### Cloudflare Protection

LMS Mentari dilindungi Cloudflare. Token yang diambil dari Puppeteer tidak bisa dipakai di Node.js fetch biasa karena terikat ke TLS fingerprint browser. Oleh karena itu:

- Semua request API dijalankan dari dalam Puppeteer (`page.evaluate`)
- Browser Chromium harus tetap terbuka selama CLI digunakan
- Jika browser ditutup, CLI akan meminta login ulang otomatis

### Quota Gemini Free Tier

Model Gemini free tier memiliki batas request per hari. Jika quota habis:

1. CLI otomatis mencoba model berikutnya (fallback)
2. Atau gunakan menu **Ganti Model AI** untuk pilih model yang masih tersedia
3. Quota reset setiap hari pukul 00:00 UTC (07:00 WIB)

### Urutan Tahap LMS

LMS Mentari memiliki prasyarat ketat:

| Tahap | Prasyarat |
|-------|-----------|
| Forum Diskusi | Pre-Test selesai |
| Post-Test | Forum Diskusi selesai |
| Kuesioner/Absensi | Post-Test selesai |

Gunakan **Eksekusi Semua Tahap Sekaligus** untuk menjalankan semua tahap secara berurutan otomatis.

### Token Expired

Jika token expired di tengah proses:
- CLI otomatis mendeteksi error 403
- Browser login terbuka kembali
- Setelah login ulang, proses dilanjutkan dari titik yang sama

---

## Dibuat oleh

**Revan** — MENTARI CLI v2.0
