# Intan Outfit - Employee Management System (EMS)

Sistem Informasi Manajemen Karyawan dan Absensi untuk Toko Baju Muslim **Intan Outfit**, dibangun berdasarkan 6 dokumen acuan: PRD, TRD, AFD, DBD, BSD, dan IPD.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 / 19 + TypeScript + Vite
- **Styling:** TailwindCSS + Lucide Icons
- **State Management & Data Fetching:** TanStack React Query v5 + Zustand
- **Mobile & Offline Support:** Progressive Web App (PWA) + Service Worker
- **Exporting & Utilities:** jsPDF + html2canvas + date-fns

### Backend
- **Runtime:** Node.js + Express
- **Language:** TypeScript (`tsx`)
- **Database & ORM:** PostgreSQL 17 + Prisma ORM v5
- **Authentication & Security:** JWT (Access Token + Refresh Token) + bcryptjs + Helmet + CORS + Express Rate Limit
- **Reporting & File Upload:** ExcelJS + Multer

---

## 👥 Hak Akses & Kredensial Default

| Peran | Email | Password | Tampilan / Layout |
|-------|-------|----------|-------------------|
| **Owner** | `intan@intanoutfit.com` | `Admin123!` | Desktop Sidebar + Mobile Drawer |
| **Karyawan** | `karyawan@intanoutfit.com` | `Karyawan123!` | Mobile-First Bottom Navigation |

---

## 📦 14 Modul MVP yang Diimplementasikan

1. **Autentikasi & Otorisasi:** Login JWT berbasis peran (Owner / Employee), reset password, aktivasi akun.
2. **Manajemen Karyawan:** CRUD data karyawan, status kepegawaian (ACTIVE, INACTIVE, RESIGNED), riwayat tarif upah shift & uang sakit berhistoris.
3. **Manajemen Jadwal & Shift Kerja:** Shift Pagi (06:00–14:00) & Shift Malam (14:00–22:00), penugasan karyawan per tanggal, validasi kapasitas maksimal (2 orang/shift).
4. **Absensi Selfie & Presensi:** Kamera selfie langsung di browser/mobile, validasi toleransi keterlambatan, penandaan status (ON_TIME, LATE, ABSENT, MANUAL), dan fitur koreksi absensi manual oleh Owner.
5. **Pengajuan Izin & Cuti:** Pengajuan rentang tanggal izin oleh karyawan, peninjauan (setujui / tolak) dengan catatan oleh Owner.
6. **Laporan Penjualan Harian:** Input omzet kotor, omzet bersih, jumlah transaksi, status DRAFT → SUBMITTED → VERIFIED/REJECTED. Laporan terlambat tetap diterima dengan penanda.
7. **Perhitungan Bonus Otomatis:** Dihitung otomatis saat laporan penjualan diverifikasi oleh Owner berdasarkan kebijakan bonus aktif (contoh: kelipatan Rp5.000.000 omzet = Rp50.000 bonus per karyawan shift).
8. **Penggajian (Payroll):** Perhitungan gaji bulanan otomatis (total upah shift + uang sakit izin + akumulasi bonus penjualan ± penyesuaian/adjusment).
9. **Pencatatan Pembayaran Gaji:** Konfirmasi pembayaran gaji berstatus APPROVED via transfer bank / tunai / e-wallet beserta nomor referensi transaksi.
10. **Dashboard Owner & Karyawan:** Ringkasan kehadiran harian, omzet bulanan, izin & laporan yang perlu ditindaklanjuti, statistik performa kerja.
11. **Laporan & Ekspor Excel:** Laporan rekap kehadiran, penjualan, dan penggajian bulanan dengan fitur unduh file Excel (`.xlsx`).
12. **Notifikasi Sistem:** Notifikasi internal real-time untuk penugasan jadwal, status absensi, pengajuan izin, dan persetujuan gaji.
13. **Audit Log:** Pencatatan otomatis riwayat aksi sensitif (perubahan jadwal, tarif, koreksi absensi, peninjauan izin, payroll, pembayaran).
14. **Pengaturan Sistem:** Konfigurasi batas bonus, jam shift, toleransi waktu, dan parameter operasional lainnya.

---

## 🚀 Cara Menjalankan Aplikasi

### Prasyarat
- Node.js (v18+)
- PostgreSQL 17 (Database: `intan_outfit`, User: `postgres`, Password: `IntanOutfit2025`, Port: `5432`)

### 1. Backend

```bash
cd backend

# Install dependencies (jika belum)
npm install

# Setup Prisma schema & generate client
npx prisma generate
npx prisma db push

# Menjalankan server backend (Port 5000)
npm run dev
```

Endpoint Health Check: `http://localhost:5000/health`  
Base API: `http://localhost:5000/api/v1`

### 2. Frontend

```bash
cd frontend

# Install dependencies (jika belum)
npm install

# Menjalankan server frontend (Port 5173)
npm run dev

# Membangun produksi (build)
npm run build
```

Aplikasi dapat diakses di browser pada: `http://localhost:5173`

