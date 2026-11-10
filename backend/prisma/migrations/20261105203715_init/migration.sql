-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESIGNED');

-- CreateEnum
CREATE TYPE "AuthTokenPurpose" AS ENUM ('ACCOUNT_ACTIVATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('ON_TIME', 'LATE');

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('CAMERA', 'MANUAL');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('PERMISSION', 'SICK', 'PLANNED_LEAVE');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SalesReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "PayrollItemType" AS ENUM ('SHIFT_PAY', 'SICK_PAY', 'BONUS', 'ADJUSTMENT_POSITIVE', 'ADJUSTMENT_NEGATIVE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SCHEDULE', 'ATTENDANCE', 'LEAVE', 'SALES', 'BONUS', 'PAYROLL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('ATTENDANCE_SELFIE', 'LEAVE_ATTACHMENT', 'SALES_SCREENSHOT', 'PAYMENT_PROOF', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "email_verified_at" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "employee_code" VARCHAR(30) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(25),
    "address" TEXT,
    "position" VARCHAR(100),
    "joined_at" DATE NOT NULL,
    "employment_status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "profile_photo_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "purpose" "AuthTokenPurpose" NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_pay_rates" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "rate_amount" BIGINT NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_pay_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_shifts" (
    "id" UUID NOT NULL,
    "shift_code" VARCHAR(20) NOT NULL,
    "shift_name" VARCHAR(50) NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" UUID NOT NULL,
    "schedule_date" DATE NOT NULL,
    "shift_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_assignments" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "assignment_status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigned_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "schedule_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_day_offs" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "day_off_date" DATE NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "employee_day_offs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "schedule_assignment_id" UUID NOT NULL,
    "check_in_at" TIMESTAMPTZ NOT NULL,
    "attendance_status" "AttendanceStatus" NOT NULL,
    "attendance_method" "AttendanceMethod" NOT NULL,
    "selfie_file_id" UUID,
    "pay_rate_snapshot" BIGINT NOT NULL,
    "manual_reason" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "attachment_file_id" UUID,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_reports" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "submitted_by_employee_id" UUID,
    "created_by" UUID NOT NULL,
    "gross_sales" BIGINT NOT NULL,
    "screenshot_file_id" UUID NOT NULL,
    "submitted_at" TIMESTAMPTZ,
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "status" "SalesReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sales_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_policies" (
    "id" UUID NOT NULL,
    "target_amount" BIGINT NOT NULL,
    "bonus_amount" BIGINT NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonus_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_details" (
    "id" UUID NOT NULL,
    "sales_report_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "bonus_policy_id" UUID NOT NULL,
    "target_snapshot" BIGINT NOT NULL,
    "bonus_amount_snapshot" BIGINT NOT NULL,
    "achieved_multiple" INTEGER NOT NULL,
    "total_bonus" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonus_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payrolls" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "base_pay_total" BIGINT NOT NULL DEFAULT 0,
    "sick_pay_total" BIGINT NOT NULL DEFAULT 0,
    "bonus_total" BIGINT NOT NULL DEFAULT 0,
    "positive_adjustment_total" BIGINT NOT NULL DEFAULT 0,
    "negative_adjustment_total" BIGINT NOT NULL DEFAULT 0,
    "net_salary" BIGINT NOT NULL DEFAULT 0,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" UUID NOT NULL,
    "payroll_id" UUID NOT NULL,
    "item_type" "PayrollItemType" NOT NULL,
    "attendance_id" UUID,
    "schedule_assignment_id" UUID,
    "leave_request_id" UUID,
    "bonus_detail_id" UUID,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_amount" BIGINT NOT NULL,
    "total_amount" BIGINT NOT NULL,
    "reason" TEXT,
    "source_snapshot" JSONB,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "payroll_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "payment_date" TIMESTAMPTZ NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "reference_number" VARCHAR(100),
    "proof_file_id" UUID,
    "notes" TEXT,
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "notification_type" "NotificationType" NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID,
    "before_data" JSONB,
    "after_data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "file_category" "FileCategory" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" UUID NOT NULL,
    "holiday_date" DATE NOT NULL,
    "holiday_name" VARCHAR(150) NOT NULL,
    "is_national" BOOLEAN NOT NULL DEFAULT true,
    "is_working_day" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL,
    "setting_key" VARCHAR(100) NOT NULL,
    "setting_value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_code_key" ON "employees"("employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "work_shifts_shift_code_key" ON "work_shifts"("shift_code");

-- CreateIndex
CREATE UNIQUE INDEX "work_schedules_schedule_date_shift_id_key" ON "work_schedules"("schedule_date", "shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_day_offs_employee_id_day_off_date_key" ON "employee_day_offs"("employee_id", "day_off_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_schedule_assignment_id_key" ON "attendances"("schedule_assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_reports_schedule_id_key" ON "sales_reports"("schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "bonus_details_sales_report_id_employee_id_key" ON "bonus_details"("sales_report_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_employee_id_period_start_period_end_key" ON "payrolls"("employee_id", "period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payroll_id_key" ON "payments"("payroll_id");

-- CreateIndex
CREATE UNIQUE INDEX "files_storage_key_key" ON "files"("storage_key");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_holiday_date_key" ON "holidays"("holiday_date");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_setting_key_key" ON "system_settings"("setting_key");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_profile_photo_id_fkey" FOREIGN KEY ("profile_photo_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_pay_rates" ADD CONSTRAINT "employee_pay_rates_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_pay_rates" ADD CONSTRAINT "employee_pay_rates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "work_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "work_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_assignments" ADD CONSTRAINT "schedule_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_day_offs" ADD CONSTRAINT "employee_day_offs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_day_offs" ADD CONSTRAINT "employee_day_offs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_schedule_assignment_id_fkey" FOREIGN KEY ("schedule_assignment_id") REFERENCES "schedule_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_selfie_file_id_fkey" FOREIGN KEY ("selfie_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_attachment_file_id_fkey" FOREIGN KEY ("attachment_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reports" ADD CONSTRAINT "sales_reports_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "work_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reports" ADD CONSTRAINT "sales_reports_submitted_by_employee_id_fkey" FOREIGN KEY ("submitted_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reports" ADD CONSTRAINT "sales_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reports" ADD CONSTRAINT "sales_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reports" ADD CONSTRAINT "sales_reports_screenshot_file_id_fkey" FOREIGN KEY ("screenshot_file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_policies" ADD CONSTRAINT "bonus_policies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_details" ADD CONSTRAINT "bonus_details_sales_report_id_fkey" FOREIGN KEY ("sales_report_id") REFERENCES "sales_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_details" ADD CONSTRAINT "bonus_details_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_details" ADD CONSTRAINT "bonus_details_bonus_policy_id_fkey" FOREIGN KEY ("bonus_policy_id") REFERENCES "bonus_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_bonus_detail_id_fkey" FOREIGN KEY ("bonus_detail_id") REFERENCES "bonus_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_proof_file_id_fkey" FOREIGN KEY ("proof_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
