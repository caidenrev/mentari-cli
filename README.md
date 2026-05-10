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

[![npm version](https://img.shields.io/npm/v/mentari-cli.svg)](https://www.npmjs.com/package/mentari-cli)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Daftar Isi

- [Tentang](#tentang)
- [Fitur](#fitur)
- [Prasyarat](#prasyarat)
- [Instalasi](#instalasi)
- [Setup Pertama Kali](#setup-pertama-kali)
- [Cara Penggunaan](#cara-penggunaan)
- [Catatan Penting](#catatan-penting)
- [Troubleshooting](#troubleshooting)

---

## Tentang

MENTARI CLI adalah tools otomasi berbasis Node.js untuk mahasiswa UNPAM yang menggunakan LMS Mentari. CLI ini mengotomasi pekerjaan berulang seperti mengerjakan pre-test, post-test, forum diskusi, dan mengisi kuesioner absensi — semuanya dibantu oleh AI Gemini.

Login dilakukan melalui browser Chrome yang dibuka otomatis, sehingga Cloudflare tidak memblokir akses. Semua request API dijalankan dari dalam browser yang sama untuk memastikan sesi tetap valid.

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
| **Auto-Reauth** | Token expired otomatis meminta login ulang tanpa restart |

---

## Prasyarat

Pastikan semua ini sudah ada di device sebelum install:

| Kebutuhan | Versi | Link |
|-----------|-------|------|
| **Node.js** | v18 atau lebih baru | [nodejs.org/en/download](https://nodejs.org/en/download) |
| **Google Chrome** atau **Microsoft Edge** | Versi terbaru | [google.com/chrome](https://www.google.com/chrome) |
| **Gemini API Key** | Gratis | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| **Akun LMS Mentari** | Aktif | mentari.unpam.ac.id |

> CLI menggunakan Chrome/Edge yang sudah ada di device — **tidak perlu download browser tambahan**.

### Cek Node.js sudah terinstall

```bash
node --version
# Harus muncul: v18.x.x atau lebih baru
```

Kalau belum ada, download di [nodejs.org](https://nodejs.org) → pilih versi **LTS**.

---

## Instalasi

### Install Global (Sekali, Pakai Selamanya)

```bash
npm install -g mentari-cli
```

Tunggu hingga selesai (~30 detik), lalu langsung jalankan:

```bash
mentari
```

### Update ke Versi Terbaru

```bash
npm update -g mentari-cli
```

### Uninstall

```bash
npm uninstall -g mentari-cli
```

---

## Setup Pertama Kali

Saat pertama kali menjalankan `mentari`, ada dua langkah setup otomatis:

### Langkah 1 — Gemini API Key

CLI akan meminta API key untuk fitur AI:

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

**Cara dapat API key:**
1. Buka [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Login dengan akun Google
3. Klik **Create API Key**
4. Copy key yang muncul, paste ke CLI

Key disimpan permanen di device — tidak perlu dimasukkan lagi di sesi berikutnya.

---

### Langkah 2 — Login LMS Mentari

```
┌─ AUTENTIKASI MENTARI CLI ──────────────────────────────────┐
│  ▶ Browser akan terbuka otomatis                           │
│  ▶ Login dengan NIM dan password seperti biasa             │
│  ▶ CLI otomatis mendeteksi token setelah login             │
│  Browser tetap terbuka di background untuk bypass CF       │
└────────────────────────────────────────────────────────────┘
```

1. Browser Chrome terbuka otomatis ke halaman login Mentari
2. Login dengan **NIM** dan **password** seperti biasa
3. CLI otomatis mendeteksi token — tidak perlu copy-paste apapun
4. Browser tetap terbuka di background (jangan ditutup)

Setelah dua langkah ini selesai, CLI langsung masuk ke menu utama dan siap digunakan.

---

## Cara Penggunaan

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

Navigasi menggunakan tombol **↑ ↓** dan **Enter**.

---

### Scan Tugas Pending

Memindai semua mata kuliah dan menampilkan pertemuan yang belum tuntas.

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

Pilih mata kuliah → masukkan nomor pertemuan → pilih tahap:

```
● [1] Pre-Test
● [2] Forum Diskusi
● [3] Post-Test
● [4] Kuesioner / Absensi
────────────────────────────────────────
▶ Eksekusi Semua Tahap Sekaligus
────────────────────────────────────────
└ Kembali ke Menu Utama
```

**Urutan yang harus diikuti:**

```
Pre-Test  →  Forum Diskusi  →  Post-Test  →  Kuesioner
```

Setiap tahap hanya bisa dikerjakan setelah tahap sebelumnya selesai. Gunakan **Eksekusi Semua Tahap Sekaligus** untuk menjalankan semua secara otomatis berurutan.

---

### Chat Bot Asisten AI

```
❯ apa itu LMS Mentari?

┌─ Bot ──────────────────────────────────────────┐
│ LMS Mentari adalah platform pembelajaran       │
│ daring milik Universitas Pamulang (UNPAM).     │
└────────────────────────────────────────────────┘
```

- Ketik `keluar` untuk kembali ke menu utama
- Ketik `/model` untuk ganti model AI

---

### Ganti Model AI

Tampilkan semua model Gemini yang tersedia beserta status quota:

```
● gemini-2.5-pro        ● tersedia
● gemini-2.5-flash      ● tersedia  ← aktif
● gemini-2.0-flash      ⚠ quota habis
↩ Batal
```

Quota Gemini free tier reset setiap hari pukul **07:00 WIB**.

---

## Catatan Penting

### Jangan Tutup Browser

Browser Chrome yang terbuka saat login **harus tetap terbuka** selama CLI digunakan. Browser ini dipakai untuk semua request API agar tidak diblokir Cloudflare. Jika ditutup, CLI akan meminta login ulang.

### Urutan Tahap LMS

| Tahap | Prasyarat |
|-------|-----------|
| Forum Diskusi | Pre-Test selesai |
| Post-Test | Forum Diskusi selesai |
| Kuesioner/Absensi | Post-Test selesai |

### Quota Gemini Free Tier

Jika muncul pesan "quota habis", gunakan menu **Ganti Model AI** untuk beralih ke model lain yang masih tersedia, atau tunggu reset quota jam 07:00 WIB.

---

## Troubleshooting

### `mentari` tidak dikenali setelah install

```bash
# Cek apakah npm global bin ada di PATH
npm config get prefix
# Tambahkan <prefix>/bin ke PATH sistem kamu
```

Atau coba install ulang:
```bash
npm uninstall -g mentari-cli
npm install -g mentari-cli
```

### Browser tidak terbuka otomatis

Pastikan Google Chrome atau Microsoft Edge sudah terinstall. CLI mencari browser di lokasi default:
- **Windows:** `C:\Program Files\Google\Chrome\...`
- **macOS:** `/Applications/Google Chrome.app/...`
- **Linux:** `/usr/bin/google-chrome`

### Login gagal / token tidak terdeteksi

Jika login otomatis gagal, CLI akan beralih ke mode input manual:
```
Paste BEARER_TOKEN: <dari F12 → Network → Authorization header>
Paste CF_CLEARANCE: <dari F12 → Network → Cookie header>
```

### Quota AI habis semua

Semua model Gemini free tier punya limit harian. Jika semua habis:
1. Tunggu reset jam 07:00 WIB
2. Atau upgrade ke Gemini API berbayar di [aistudio.google.com](https://aistudio.google.com)

---

## Dibuat oleh

**Revan** — MENTARI CLI v2.0  
[npmjs.com/package/mentari-cli](https://www.npmjs.com/package/mentari-cli)
