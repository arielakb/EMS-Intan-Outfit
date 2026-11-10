// API types matching backend responses

export type UserRole = 'OWNER' | 'EMPLOYEE';
export type UserStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'INACTIVE';
export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'RESIGNED';
export type AttendanceStatus = 'ON_TIME' | 'LATE' | 'ABSENT' | 'MANUAL';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type SalesReportStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
export type PayrollStatus = 'DRAFT' | 'WAITING_APPROVAL' | 'APPROVED' | 'PAID';
export type PaymentMethod = 'TRANSFER_BANK' | 'CASH' | 'EWALLET';
export type FileType = 'ATTENDANCE_SELFIE' | 'PROFILE_PHOTO' | 'SALES_DOCUMENT' | 'OTHER';
export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

// Auth
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  employeeId?: string;
  employee?: {
    id: string;
    fullName: string;
    code: string;
    profilePhotoUrl?: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

// Employee
export interface Employee {
  id: string;
  code: string;
  fullName: string;
  phone?: string;
  address?: string;
  employmentStatus: EmploymentStatus;
  joinDate: string;
  resignDate?: string;
  profilePhotoUrl?: string;
  user?: {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
  };
  currentShiftRate?: ShiftRate;
}

export interface ShiftRate {
  id: string;
  ratePerShift: number;
  sickPayPerDay: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

// Schedule
export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  maxEmployees: number;
  color: string;
}

export interface ScheduleAssignment {
  id: string;
  date: string;
  employee: { id: string; fullName: string; code: string };
  shift: Shift;
  attendance?: Attendance;
}

// Attendance
export interface Attendance {
  id: string;
  checkInAt: string;
  status: AttendanceStatus;
  lateMinutes?: number;
  selfieFileId?: string;
  selfieUrl?: string;
  notes?: string;
  scheduleAssignment?: ScheduleAssignment;
}

// Leave
export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  rejectionReason?: string;
  createdAt: string;
  employee?: { id: string; fullName: string; code: string };
  reviewedBy?: { id: string; email: string };
  reviewedAt?: string;
}

// Sales
export interface SalesReport {
  id: string;
  reportDate: string;
  grossSales: number;
  netSales: number;
  transactionCount: number;
  notes?: string;
  status: SalesReportStatus;
  rejectionReason?: string;
  submittedAt?: string;
  verifiedAt?: string;
  shift?: Shift;
  submittedBy?: { id: string; fullName: string };
}

// Bonus
export interface BonusCalculation {
  id: string;
  amount: number;
  multiplier: number;
  baseAmount: number;
  calculatedAt: string;
  salesReport?: SalesReport;
  employee?: { id: string; fullName: string };
  shift?: Shift;
}

// Payroll
export interface PayrollPeriod {
  id: string;
  year: number;
  month: number;
  status: PayrollStatus;
  totalAmount: number;
  generatedAt: string;
  approvedAt?: string;
  paidAt?: string;
  payrollItems?: PayrollItem[];
}

export interface PayrollItem {
  id: string;
  employeeId: string;
  employee?: { id: string; fullName: string; code: string };
  shiftsWorked: number;
  baseShiftPay: number;
  sickDays: number;
  sickPay: number;
  bonusAmount: number;
  adjustments: number;
  adjustmentNotes?: string;
  totalAmount: number;
  status: PayrollStatus;
  payment?: PaymentRecord;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  notes?: string;
  referenceNumber?: string;
}

// Notification
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  createdAt: string;
  user?: { id: string; email: string; role: UserRole };
}

// Settings
export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
}

export interface BonusPolicy {
  id: string;
  thresholdAmount: number;
  bonusPerThreshold: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

// API Response wrappers
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// Dashboard
export interface OwnerDashboard {
  today: {
    present: number;
    absent: number;
    late: number;
    total: number;
    byShift: Array<{ shiftName: string; present: number; total: number }>;
  };
  pending: {
    leaveRequests: number;
    salesReports: number;
    payrolls: number;
  };
  thisMonth: {
    totalSales: number;
    totalBonus: number;
    payrollAmount: number;
  };
}

export interface EmployeeDashboard {
  today?: {
    attendance?: Attendance;
    schedule?: ScheduleAssignment;
    hasCheckedIn: boolean;
  };
  thisMonth: {
    shiftsWorked: number;
    totalBonus: number;
    estimatedPay: number;
  };
  pendingLeave: number;
  unreadNotifications: number;
}

