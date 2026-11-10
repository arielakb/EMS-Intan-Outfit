# Script Pengujian Verifikasi Data Database - Intan Outfit EMS
# Memvalidasi seluruh data yang telah dimasukkan ke PostgreSQL via API

$ErrorActionPreference = "Continue"
$base = "http://localhost:5000/api/v1"
$passed = 0
$failed = 0
$total = 0

function Check-Assert($title, $condition, $info = "") {
    $script:total++
    if ($condition) {
        Write-Host " [PASS] $title" -ForegroundColor Green
        if ($info) { Write-Host "        $info" -ForegroundColor Gray }
        $script:passed++
    } else {
        Write-Host " [FAIL] $title" -ForegroundColor Red
        if ($info) { Write-Host "        $info" -ForegroundColor DarkRed }
        $script:failed++
    }
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   PENGUJIAN VALIDASI DATA DATABASE (INTAN OUTFIT EMS)  " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Login Owner
Write-Host "--- 1. AUTENTIKASI OWNER ---" -ForegroundColor Yellow
$ownerLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"intan@intanoutfit.com","password":"Admin123!"}'
$ownerToken = $ownerLogin.data.accessToken
Check-Assert "Owner Berhasil Login" ($ownerToken -ne $null -and $ownerLogin.data.user.role -eq "OWNER") "Token didapatkan untuk intan@intanoutfit.com"

# 2. Verifikasi Data Karyawan
Write-Host "`n--- 2. DATA KARYAWAN DI DATABASE ---" -ForegroundColor Yellow
$empList = Invoke-RestMethod -Uri "$base/employees?pageSize=20" -Headers @{ Authorization = "Bearer $ownerToken" }
$allEmps = @($empList.data.items)
Check-Assert "Jumlah Karyawan Terdaftar" ($allEmps.Count -ge 5) "Total karyawan terdaftar: $($allEmps.Count) orang"

$sitiData = $allEmps | Where-Object { $_.code -eq "EMP-001" } | Select-Object -First 1
Check-Assert "Karyawan Siti Aminah (EMP-001) Aktif" ($sitiData -ne $null -and $sitiData.employmentStatus -eq "ACTIVE") "Nama: $($sitiData.fullName), No HP: $($sitiData.phone)"

$budiData = $allEmps | Where-Object { $_.code -eq "EMP-002" } | Select-Object -First 1
Check-Assert "Karyawan Budi Santoso (EMP-002) Aktif" ($budiData -ne $null -and $budiData.employmentStatus -eq "ACTIVE") "Nama: $($budiData.fullName), No HP: $($budiData.phone)"

# 3. Verifikasi Roster Jadwal Shift (November 2026)
Write-Host "`n--- 3. ROSTER JADWAL KERJA (NOVEMBER 2026) ---" -ForegroundColor Yellow
$schedList = Invoke-RestMethod -Uri "$base/schedules?month=2026-11&pageSize=100" -Headers @{ Authorization = "Bearer $ownerToken" }
$allScheds = @($schedList.data.items)
Check-Assert "Penugasan Jadwal Shift November" ($allScheds.Count -ge 20) "Total jadwal terjadwal: $($allScheds.Count) slot penugasan"

# 4. Verifikasi Data Presensi & Absensi
Write-Host "`n--- 4. RIWAYAT PRESENSI & ABSENSI ---" -ForegroundColor Yellow
$attList = Invoke-RestMethod -Uri "$base/attendances?pageSize=100" -Headers @{ Authorization = "Bearer $ownerToken" }
$allAtts = @($attList.data.items)
Check-Assert "Data Presensi Masuk ke Database" ($allAtts.Count -ge 10) "Total data presensi tercatat: $($allAtts.Count) entri"

$onTimeCount = @($allAtts | Where-Object { $_.status -eq "ON_TIME" }).Count
$lateCount = @($allAtts | Where-Object { $_.status -eq "LATE" }).Count
$manualCount = @($allAtts | Where-Object { $_.status -eq "MANUAL" }).Count
Check-Assert "Variasi Status Kehadiran (Tepat Waktu, Terlambat, Manual)" ($onTimeCount -gt 0 -and $lateCount -gt 0 -and $manualCount -gt 0) "ON_TIME: $onTimeCount, LATE: $lateCount, MANUAL: $manualCount"

# 5. Verifikasi Permohonan Cuti & Izin
Write-Host "`n--- 5. PERMOHONAN IZIN & CUTI ---" -ForegroundColor Yellow
$leaveList = Invoke-RestMethod -Uri "$base/leave-requests" -Headers @{ Authorization = "Bearer $ownerToken" }
$allLeaves = @($leaveList.data.items)
Check-Assert "Daftar Pengajuan Cuti di Database" ($allLeaves.Count -ge 3) "Total pengajuan cuti: $($allLeaves.Count)"

$approvedLeave = $allLeaves | Where-Object { $_.status -eq "APPROVED" } | Select-Object -First 1
$pendingLeave = $allLeaves | Where-Object { $_.status -eq "PENDING" } | Select-Object -First 1
$rejectedLeave = $allLeaves | Where-Object { $_.status -eq "REJECTED" } | Select-Object -First 1
Check-Assert "Status Cuti: Ada yang APPROVED, PENDING, & REJECTED" ($approvedLeave -ne $null -and $pendingLeave -ne $null -and $rejectedLeave -ne $null) "Approved: $($approvedLeave.reason), Pending: $($pendingLeave.reason)"

# 6. Verifikasi Laporan Penjualan Harian & Bonus
Write-Host "`n--- 6. LAPORAN PENJUALAN & BONUS OTOMATIS ---" -ForegroundColor Yellow
$salesList = Invoke-RestMethod -Uri "$base/sales-reports?pageSize=20" -Headers @{ Authorization = "Bearer $ownerToken" }
$allSales = @($salesList.data.items)
Check-Assert "Laporan Penjualan Tersedia" ($allSales.Count -ge 8) "Total laporan penjualan: $($allSales.Count)"

$verifiedSales = @($allSales | Where-Object { $_.status -eq "VERIFIED" })
$submittedSales = @($allSales | Where-Object { $_.status -eq "SUBMITTED" })
Check-Assert "Laporan Status VERIFIED & SUBMITTED" ($verifiedSales.Count -ge 5 -and $submittedSales.Count -ge 1) "Verified: $($verifiedSales.Count), Menunggu Verifikasi: $($submittedSales.Count)"

$bonusList = Invoke-RestMethod -Uri "$base/bonuses?pageSize=50" -Headers @{ Authorization = "Bearer $ownerToken" }
$allBonuses = @($bonusList.data.items)
Check-Assert "Bonus Terhitung Otomatis dari Omzet" ($allBonuses.Count -ge 5) "Total akumulasi bonus karyawan shift: $($allBonuses.Count) rincian bonus"

# 7. Verifikasi Penggajian (Payroll & Riwayat Pembayaran)
Write-Host "`n--- 7. PENGGAJIAN (PAYROLL) & BUKTI PEMBAYARAN ---" -ForegroundColor Yellow
$payrollList = Invoke-RestMethod -Uri "$base/payrolls?year=2026" -Headers @{ Authorization = "Bearer $ownerToken" }
$allPayrolls = @($payrollList.data.items)
Check-Assert "Rekap Payroll Tersedia" ($allPayrolls.Count -ge 4) "Total slip gaji di database: $($allPayrolls.Count)"

$paidPayroll = @($allPayrolls | Where-Object { $_.status -eq "PAID" })
$approvedPayroll = @($allPayrolls | Where-Object { $_.status -eq "APPROVED" })
Check-Assert "Payroll Bulan Oktober Berstatus PAID" ($paidPayroll.Count -ge 1) "Payroll lunas: $($paidPayroll.Count) karyawan (lengkap dengan No. Referensi Bank)"
Check-Assert "Payroll Bulan November Berstatus APPROVED" ($approvedPayroll.Count -ge 1) "Payroll disetujui: $($approvedPayroll.Count) karyawan"

# 8. Verifikasi Dashboard KPI Stats
Write-Host "`n--- 8. KPI DASHBOARD OWNER ---" -ForegroundColor Yellow
$dash = Invoke-RestMethod -Uri "$base/reports/dashboard" -Headers @{ Authorization = "Bearer $ownerToken" }
Check-Assert "KPI Dashboard Menghitung Data Riil" ($dash.data.totalActiveEmployees -ge 4 -and [int64]$dash.data.month.totalSales -gt 0) "Karyawan Aktif: $($dash.data.totalActiveEmployees), Total Omzet Bulan Ini: Rp$([int64]$dash.data.month.totalSales)"

# 9. Verifikasi Pengalaman Login Karyawan (Siti Aminah & Budi Santoso)
Write-Host "`n--- 9. PENGUJIAN AKSES ROLE KARYAWAN ---" -ForegroundColor Yellow
# Siti Login via karyawan@intanoutfit.com
$sitiLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"karyawan@intanoutfit.com","password":"Karyawan123!"}'
$sitiToken = $sitiLogin.data.accessToken
Check-Assert "Karyawan Siti Aminah Bisa Login" ($sitiToken -ne $null -and $sitiLogin.data.user.role -eq "EMPLOYEE") "Nama User: $($sitiLogin.data.user.name)"

# Siti my-schedule
$sitiSched = Invoke-RestMethod -Uri "$base/schedules/me?month=2026-11" -Headers @{ Authorization = "Bearer $sitiToken" }
Check-Assert "Siti Melihat Jadwal Pribadi" (@($sitiSched.data.items).Count -gt 0) "Total jadwal Siti: $(@($sitiSched.data.items).Count) shift"

# Siti my-payroll
$sitiPay = Invoke-RestMethod -Uri "$base/payrolls/me" -Headers @{ Authorization = "Bearer $sitiToken" }
Check-Assert "Siti Melihat Slip Gaji Sendiri" (@($sitiPay.data.items).Count -gt 0) "Slip gaji Siti: $(@($sitiPay.data.items).Count) periode"

# Siti my-bonus
$sitiBonus = Invoke-RestMethod -Uri "$base/bonuses/me" -Headers @{ Authorization = "Bearer $sitiToken" }
Check-Assert "Siti Melihat Akumulasi Bonus Pribadi" (@($sitiBonus.data.items).Count -gt 0) "Rincian bonus Siti: $(@($sitiBonus.data.items).Count) kali dapat bonus"

# Budi Login
$budiLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"budi@intanoutfit.com","password":"Karyawan123!"}'
$budiToken = $budiLogin.data.accessToken
Check-Assert "Karyawan Budi Santoso Bisa Login" ($budiToken -ne $null -and $budiLogin.data.user.role -eq "EMPLOYEE") "Nama User: $($budiLogin.data.user.name)"

# Siti Alternatif Login
$sitiAltLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"siti@intanoutfit.com","password":"Karyawan123!"}'
Check-Assert "Karyawan siti@intanoutfit.com Bisa Login" ($sitiAltLogin.data.accessToken -ne $null) "User: $($sitiAltLogin.data.user.email)"

# 10. Audit Log & Notifikasi
Write-Host "`n--- 10. AUDIT LOG & NOTIFIKASI SISTEM ---" -ForegroundColor Yellow
$notifs = Invoke-RestMethod -Uri "$base/notifications" -Headers @{ Authorization = "Bearer $ownerToken" }
Check-Assert "Notifikasi Tersedia di Database" (@($notifs.data.items).Count -gt 0) "Total notifikasi masuk: $(@($notifs.data.items).Count)"

$logs = Invoke-RestMethod -Uri "$base/audit-logs" -Headers @{ Authorization = "Bearer $ownerToken" }
Check-Assert "Audit Log Mencatat Aktivitas" (@($logs.data.items).Count -gt 0) "Total jejak audit log: $(@($logs.data.items).Count) aktivitas tersimpan"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   RINGKASAN HASIL PENGUJIAN DATABASE" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Total Pengujian : $total"
Write-Host " Berhasil (PASS) : $passed" -ForegroundColor Green
Write-Host " Gagal    (FAIL) : $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host " Tingkat Sukses  : $([math]::Round(($passed / $total) * 100, 2))%" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Cyan
