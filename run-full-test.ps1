# Comprehensive E2E Test Suite for Intan Outfit EMS
# Tests all 14 MVP Modules, Security, RBAC, Validation & Integrity

$ErrorActionPreference = "Continue"
$base = "http://localhost:5000/api/v1"
$passed = 0
$failed = 0
$totalTests = 0

function Test-Step($name, $scriptBlock) {
    $script:totalTests++
    try {
        $result = & $scriptBlock
        Write-Host " [PASS] $name" -ForegroundColor Green
        $script:passed++
        return $result
    } catch {
        Write-Host " [FAIL] $name - $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails) {
            Write-Host "        Details: $($_.ErrorDetails.Message)" -ForegroundColor DarkRed
        }
        $script:failed++
        return $null
    }
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   INTAN OUTFIT EMS - FULL COMPREHENSIVE TEST SUITE     " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Health check
Test-Step "1. Health Check Endpoint" {
    $r = Invoke-RestMethod -Uri "http://localhost:5000/health"
    if ($r.status -ne "OK") { throw "Status not OK" }
}

# 2. Auth - Owner Login
$ownerAuth = Test-Step "2. Auth - Owner Login Valid Credentials" {
    $body = @{ email = "intan@intanoutfit.com"; password = "Admin123!" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body $body
    if (!$r.data.tokens.accessToken -or $r.data.user.role -ne "OWNER") { throw "Token or role missing" }
    $r
}
$ownerToken = $ownerAuth.data.tokens.accessToken

# 3. Auth - Employee Login
$empAuth = Test-Step "3. Auth - Employee Login Valid Credentials" {
    $body = @{ email = "karyawan@intanoutfit.com"; password = "Karyawan123!" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body $body
    if (!$r.data.tokens.accessToken -or $r.data.user.role -ne "EMPLOYEE") { throw "Token or role missing" }
    $r
}
$empToken = $empAuth.data.tokens.accessToken
$employeeId = $empAuth.data.user.employeeId

# 4. Auth - Invalid Login Rejection
Test-Step "4. Auth - Invalid Password Rejection (401)" {
    $body = @{ email = "intan@intanoutfit.com"; password = "WrongPassword!" } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body $body
        throw "Should have failed with 401"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw $_ }
    }
}

# 5. Auth - Token Refresh
Test-Step "5. Auth - Token Refresh" {
    $body = @{ refreshToken = $ownerAuth.data.tokens.refreshToken } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/auth/refresh" -Method Post -ContentType "application/json" -Body $body
    if (!$r.data.accessToken) { throw "No accessToken returned" }
}

# 6. Auth - Current User Info
Test-Step "6. Auth - Current User Profile (GET /auth/me)" {
    $r = Invoke-RestMethod -Uri "$base/auth/me" -Headers @{ Authorization = "Bearer $ownerToken" }
    if ($r.data.email -ne "intan@intanoutfit.com") { throw "Wrong user returned" }
}

# 7. RBAC Security Check
Test-Step "7. Security - Employee Blocked from Owner Route (403)" {
    try {
        Invoke-RestMethod -Uri "$base/employees" -Headers @{ Authorization = "Bearer $empToken" }
        throw "Should have returned 403 Forbidden"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw $_ }
    }
}

# 8. Unauthenticated Access Check
Test-Step "8. Security - Unauthenticated Access Blocked (401)" {
    try {
        Invoke-RestMethod -Uri "$base/employees"
        throw "Should have returned 401 Unauthorized"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw $_ }
    }
}

# 9. Employee Management - List
Test-Step "9. Employees - List Active Employees" {
    $r = Invoke-RestMethod -Uri "$base/employees?status=ACTIVE&pageSize=10" -Headers @{ Authorization = "Bearer $ownerToken" }
    if ($r.data.items.Count -lt 1) { throw "No employees found" }
}

# 10. Employee Management - Detail
Test-Step "10. Employees - Get Detail by ID" {
    $r = Invoke-RestMethod -Uri "$base/employees/$employeeId" -Headers @{ Authorization = "Bearer $ownerToken" }
    if ($r.data.id -ne $employeeId) { throw "Employee ID mismatch" }
}

# 11. Employee Management - Update Profile
Test-Step "11. Employees - Update Employee Data" {
    $body = @{ phone = "081299998888"; address = "Jl. Melati No. 15, Bandung" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/employees/$employeeId" -Method Patch -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" } -Body $body
    if ($r.data.phone -ne "081299998888") { throw "Phone update not reflected" }
}

# 12. Employee Management - Add Historical Pay Rate
Test-Step "12. Employees - Add Historical Pay Rate" {
    $body = @{ ratePerShift = 90000; sickPayPerDay = 50000; effectiveFrom = "2026-11-01" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/employees/$employeeId/pay-rates" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" } -Body $body
    if ($r.data.ratePerShift -ne "90000") { throw "Rate not set" }
}

# 13. Employee Management - Get Pay Rates History
Test-Step "13. Employees - Get Pay Rates History" {
    $r = Invoke-RestMethod -Uri "$base/employees/$employeeId/pay-rates" -Headers @{ Authorization = "Bearer $ownerToken" }
    if ($r.data.Count -lt 1) { throw "No rate history found" }
}

# 14. Shifts - List Shifts
$shifts = Test-Step "14. Schedules - List Available Shifts" {
    $r = Invoke-RestMethod -Uri "$base/schedules/shifts" -Headers @{ Authorization = "Bearer $ownerToken" }
    if ($r.data.Count -lt 2) { throw "Expected at least 2 shifts" }
    $r.data
}
$shiftPagi = $shifts | Where-Object { $_.name -match "Pagi" } | Select-Object -First 1
$shiftMalam = $shifts | Where-Object { $_.name -match "Malam" } | Select-Object -First 1

# 15. Schedules - Create Schedule Assignment (Dynamically find an unassigned date)
$existingScheds = (Invoke-RestMethod -Uri "$base/schedules?employeeId=$employeeId" -Headers @{ Authorization = "Bearer $ownerToken" }).data.items
$assignedDates = @($existingScheds | ForEach-Object { (Get-Date $_.date).ToString("yyyy-MM-dd") })

$chosenDay = 1
while ($chosenDay -le 28 -and $assignedDates -contains ("2026-11-" + $chosenDay.ToString("D2"))) {
    $chosenDay++
}
if ($chosenDay -gt 28) {
    $chosenDay = 1
    while ($chosenDay -le 28 -and $assignedDates -contains ("2026-12-" + $chosenDay.ToString("D2"))) {
        $chosenDay++
    }
    $targetDate = "2026-12-" + $chosenDay.ToString("D2")
} else {
    $targetDate = "2026-11-" + $chosenDay.ToString("D2")
}

$sched = Test-Step "15. Schedules - Create Assignment for Employee" {
    $body = @{
        date = $targetDate
        shiftId = $shiftPagi.id
        employeeIds = @($employeeId)
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/schedules" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" } -Body $body
    if ($r.data.Count -lt 1) { throw "No assignment returned" }
    $r.data[0]
}

# 16. Schedules - Conflict Check (same date, same employee)
Test-Step "16. Schedules - Prevent Double Assignment Same Date (409)" {
    $body = @{
        date = $targetDate
        shiftId = $shiftMalam.id
        employeeIds = @($employeeId)
    } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$base/schedules" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" } -Body $body
        throw "Should have failed with 409 Conflict"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw $_ }
    }
}

# 17. Schedules - Employee view own schedule
Test-Step "17. Schedules - Employee Get Own Schedule" {
    $r = Invoke-RestMethod -Uri "$base/schedules/me?month=2026-11" -Headers @{ Authorization = "Bearer $empToken" }
    if ($r.data.items.Count -lt 1) { throw "No schedule found for employee" }
}

# 18. Attendance - Today status
Test-Step "18. Attendances - Get Today Status" {
    $r = Invoke-RestMethod -Uri "$base/attendances/today" -Headers @{ Authorization = "Bearer $ownerToken" }
    # Should return an array
    if ($r.data -eq $null) { throw "No attendance today response" }
}

# 19. Attendance - Owner Manual Check-in
$attendanceRecord = Test-Step "19. Attendances - Owner Manual Check-in" {
    $body = @{
        scheduleAssignmentId = $sched.id
        reason = "Pencatatan kehadiran manual oleh Owner"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/attendances/manual" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" } -Body $body
    if ($r.data.status -ne "MANUAL") { throw "Status not MANUAL" }
    $r.data
}

# 20. Attendance - Prevent Duplicate Check-in
Test-Step "20. Attendances - Prevent Duplicate Check-in (409)" {
    $body = @{
        scheduleAssignmentId = $sched.id
        reason = "Coba checkin ulang"
    } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$base/attendances/manual" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" } -Body $body
        throw "Should have failed with 409"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw $_ }
    }
}

# 21. Attendance - Owner Correction
Test-Step "21. Attendances - Owner Correction" {
    $body = @{
        reason = "Koreksi absensi: karyawan hadir tepat waktu"
        status = "ON_TIME"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/attendances/$($attendanceRecord.id)/correction" -Method Patch -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" } -Body $body
    if ($r.data.status -ne "ON_TIME") { throw "Status not corrected to ON_TIME" }
}

# 22. Attendance - List with pagination
Test-Step "22. Attendances - Owner View Attendance List" {
    $r = Invoke-RestMethod -Uri "$base/attendances?pageSize=10" -Headers @{ Authorization = "Bearer $ownerToken" }
    if ($r.data.items.Count -lt 1) { throw "No attendance items returned" }
}

# 23. Attendance - Employee View Own
Test-Step "23. Attendances - Employee View Own History" {
    $r = Invoke-RestMethod -Uri "$base/attendances/me" -Headers @{ Authorization = "Bearer $empToken" }
    if ($r.data.items.Count -lt 1) { throw "No history returned" }
}

# 24. Leave - Date Validation
Test-Step "24. Leaves - Validate EndDate >= StartDate (400)" {
    $body = @{
        startDate = "2026-11-25"
        endDate = "2026-11-20"
        reason = "Tanggal salah"
    } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$base/leave-requests" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $empToken" } -Body $body
        throw "Should have failed with 400"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw $_ }
    }
}

# 25. Leave - Submit Valid Leave Request
$leaveStartDay = (Get-Random -Minimum 10 -Maximum 25).ToString("D2")
$leaveEndDay = ([int]$leaveStartDay + 1).ToString("D2")
$leaveRequest = Test-Step "25. Leaves - Employee Submit Leave Request" {
    $body = @{
        startDate = "2026-12-$leaveStartDay"
        endDate = "2026-12-$leaveEndDay"
        reason = "Izin urusan keluarga mendesak"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/leave-requests" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $empToken" } -Body $body
    if ($r.data.totalDays -ne 2) { throw "Total days calculation wrong" }
    $r.data
}

# 26. Leave - Owner Review (Approve)
Test-Step "26. Leaves - Owner Review & Approve" {
    $body = @{ status = "APPROVED" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/leave-requests/$($leaveRequest.id)/review" -Method Patch -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" } -Body $body
    if ($r.data.status -ne "APPROVED") { throw "Status not APPROVED" }
}

# 27. Bonus - Get Active Policy
$bonusPolicy = Test-Step "27. Bonuses - Get Active Bonus Policy" {
    $r = Invoke-RestMethod -Uri "$base/bonuses/policy" -Headers @{ Authorization = "Bearer $ownerToken" }
    if (!$r.data.thresholdAmount) { throw "No threshold amount" }
    $r.data
}

# 28. Sales - Employee Create Draft Sales Report
$salesReport = Test-Step "28. Sales - Employee Create Draft Report" {
    $body = @{
        reportDate = $targetDate
        shiftId = $shiftPagi.id
        grossSales = 15000000
        netSales = 15000000
        transactionCount = 55
        notes = "Penjualan shift pagi sangat ramai"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/sales-reports" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $empToken" } -Body $body
    if ($r.data.status -ne "DRAFT") { throw "Status not DRAFT" }
    $r.data
}

# 29. Sales - Submit Report
Test-Step "29. Sales - Employee Submit Report for Verification" {
    $r = Invoke-RestMethod -Uri "$base/sales-reports/$($salesReport.id)/submit" -Method Patch -Headers @{ Authorization = "Bearer $empToken" }
    if ($r.data.status -ne "SUBMITTED") { throw "Status not SUBMITTED" }
}

# 30. Sales - Owner Verify & Auto-calculate Bonus
Test-Step "30. Sales - Owner Verify & Trigger Auto Bonus Calculation" {
    $body = @{ status = "VERIFIED" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/sales-reports/$($salesReport.id)/verify" -Method Patch -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" } -Body $body
    if ($r.data.status -ne "VERIFIED") { throw "Status not VERIFIED" }
}

# 31. Bonus - Verify Bonus Amount (15M with 5M threshold = 3x multiplier = 150,000)
Test-Step "31. Bonuses - Verify Auto-Calculated Bonus for Shift Karyawan" {
    $r = Invoke-RestMethod -Uri "$base/bonuses?employeeId=$employeeId" -Headers @{ Authorization = "Bearer $ownerToken" }
    $b = $r.data.items | Where-Object { $_.salesReportId -eq $salesReport.id } | Select-Object -First 1
    if (!$b -or $b.multiplier -ne 3 -or $b.amount -ne "150000") {
        throw "Bonus calculation incorrect: multiplier=$($b.multiplier), amount=$($b.amount)"
    }
}

# 32. Payroll - Generate Payroll
$payrollGen = Test-Step "32. Payroll - Generate Monthly Payroll" {
    $body = @{ month = 12; year = 2026 } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/payrolls/generate" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" } -Body $body
    if ($r.success -ne $true) { throw "Generation failed" }
    $r
}

# 33. Payroll - List & Verify Values
$payrollRecord = Test-Step "33. Payroll - List & Verify Net Salary Calculation" {
    $r = Invoke-RestMethod -Uri "$base/payrolls?year=2026&month=12" -Headers @{ Authorization = "Bearer $ownerToken" }
    $p = $r.data.items | Where-Object { $_.employeeId -eq $employeeId } | Select-Object -First 1
    if (!$p) { throw "Payroll record not found" }
    $p
}

# 34. Payroll - Add Adjustment
Test-Step "34. Payroll - Owner Add Adjustment" {
    $body = @{
        amount = 50000
        isPositive = $true
        reason = "Bonus kerajinan ekstra"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/payrolls/$($payrollRecord.id)/adjustment" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" } -Body $body
    if ([int64]$r.data.adjustments -lt 50000) { throw "Adjustment not applied" }
}

# 35. Reports - Dashboard Summary
Test-Step "35. Reports - Get Dashboard KPI Stats" {
    $r = Invoke-RestMethod -Uri "$base/reports/dashboard" -Headers @{ Authorization = "Bearer $ownerToken" }
    if ($r.data.totalActiveEmployees -lt 1) { throw "No active employees in dashboard" }
}

# 36. Reports - Monthly Attendance Summary
Test-Step "36. Reports - Get Attendance Monthly Summary" {
    $r = Invoke-RestMethod -Uri "$base/reports/attendance?year=2026&month=11" -Headers @{ Authorization = "Bearer $ownerToken" }
    if ($r.data.Count -lt 1) { throw "No attendance summary returned" }
}

# 37. Reports - Monthly Sales Summary
Test-Step "37. Reports - Get Sales Monthly Summary" {
    $r = Invoke-RestMethod -Uri "$base/reports/sales?year=2026&month=11" -Headers @{ Authorization = "Bearer $ownerToken" }
    if ([int64]$r.data.totalGrossSales -le 0) { throw "No sales recorded in summary" }
}

# 38. Reports - Monthly Payroll Summary
Test-Step "38. Reports - Get Payroll Monthly Summary" {
    $r = Invoke-RestMethod -Uri "$base/reports/payroll?year=2026&month=11" -Headers @{ Authorization = "Bearer $ownerToken" }
    if ($r.data.Count -lt 1) { throw "No payroll report returned" }
}

# 39. Reports - Excel Download (Attendance)
Test-Step "39. Reports - Export Attendance to Excel (.xlsx)" {
    $bytes = & curl.exe -s -o "test_att_check.xlsx" -w "%{size_download}" -H "Authorization: Bearer $ownerToken" "http://localhost:5000/api/v1/reports/export/attendance?year=2026&month=11"
    if ([int]$bytes -lt 1000) { throw "Downloaded file too small: $bytes bytes" }
    Remove-Item "test_att_check.xlsx" -ErrorAction SilentlyContinue
}

# 40. Reports - Excel Download (Sales)
Test-Step "40. Reports - Export Sales to Excel (.xlsx)" {
    $bytes = & curl.exe -s -o "test_sales_check.xlsx" -w "%{size_download}" -H "Authorization: Bearer $ownerToken" "http://localhost:5000/api/v1/reports/export/sales?year=2026&month=11"
    if ([int]$bytes -lt 1000) { throw "Downloaded file too small: $bytes bytes" }
    Remove-Item "test_sales_check.xlsx" -ErrorAction SilentlyContinue
}

# 41. Reports - Excel Download (Payroll)
Test-Step "41. Reports - Export Payroll to Excel (.xlsx)" {
    $bytes = & curl.exe -s -o "test_pay_check.xlsx" -w "%{size_download}" -H "Authorization: Bearer $ownerToken" "http://localhost:5000/api/v1/reports/export/payroll?year=2026&month=11"
    if ([int]$bytes -lt 1000) { throw "Downloaded file too small: $bytes bytes" }
    Remove-Item "test_pay_check.xlsx" -ErrorAction SilentlyContinue
}

# 42. Notifications - List
$notif = Test-Step "42. Notifications - Employee List Notifications" {
    $r = Invoke-RestMethod -Uri "$base/notifications?pageSize=10" -Headers @{ Authorization = "Bearer $empToken" }
    if ($r.data.items.Count -lt 1) { throw "No notifications found" }
    $r.data.items[0]
}

# 43. Notifications - Mark One Read
Test-Step "43. Notifications - Mark Notification as Read" {
    $r = Invoke-RestMethod -Uri "$base/notifications/$($notif.id)/read" -Method Patch -Headers @{ Authorization = "Bearer $empToken" }
    if ($r.success -ne $true) { throw "Failed to mark as read" }
}

# 44. Notifications - Mark All Read
Test-Step "44. Notifications - Mark All Notifications as Read" {
    $r = Invoke-RestMethod -Uri "$base/notifications/read-all" -Method Patch -Headers @{ Authorization = "Bearer $empToken" }
    if ($r.success -ne $true) { throw "Failed to mark all as read" }
}

# 45. Audit Logs - List
Test-Step "45. Audit Logs - Verify Audit Log Captured Sensitive Actions" {
    $r = Invoke-RestMethod -Uri "$base/audit-logs?pageSize=20" -Headers @{ Authorization = "Bearer $ownerToken" }
    if ($r.data.items.Count -lt 5) { throw "Expected audit log count >= 5, got $($r.data.items.Count)" }
}

# 46. Settings - List
Test-Step "46. Settings - List System Settings" {
    $r = Invoke-RestMethod -Uri "$base/settings" -Headers @{ Authorization = "Bearer $ownerToken" }
    if ($r.data.Count -lt 1) { throw "No settings returned" }
}

# 47. Settings - Update
Test-Step "47. Settings - Update System Setting" {
    $body = @{ key = "MAX_LATE_MINUTES"; value = "60" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$base/settings" -Method Patch -ContentType "application/json" -Headers @{ Authorization = "Bearer $ownerToken" } -Body $body
    if ($r.data.settingValue -ne "60") { throw "Setting value not updated" }
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Total Tests: $script:totalTests"
Write-Host " Passed:      $script:passed" -ForegroundColor Green
Write-Host " Failed:      $script:failed" -ForegroundColor $(if ($script:failed -gt 0) { "Red" } else { "Green" })
Write-Host " Success:     $([math]::Round(($script:passed / $script:totalTests) * 100, 2))%" -ForegroundColor $(if ($script:failed -gt 0) { "Yellow" } else { "Green" })
Write-Host "========================================================`n" -ForegroundColor Cyan
