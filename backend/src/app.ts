import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './shared/errors/error.handler';

// Routes
import authRoutes from './modules/auth/auth.routes';
import employeeRoutes from './modules/employees/employee.routes';
import scheduleRoutes from './modules/schedules/schedule.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import leaveRoutes from './modules/leaves/leave.routes';
import salesRoutes from './modules/sales/sales.routes';
import bonusRoutes from './modules/bonuses/bonus.routes';
import payrollRoutes from './modules/payroll/payroll.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import reportRoutes from './modules/reports/report.routes';
import auditLogRoutes from './modules/audit-logs/audit-log.routes';
import fileRoutes from './modules/files/file.routes';
import settingsRoutes from './modules/settings/settings.routes';

// Fix BigInt serialization globally
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting for auth
app.use('/api/v1/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Terlalu banyak percobaan login' } }));
app.use('/api/v1/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { success: false, message: 'Terlalu banyak permintaan reset password' } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const API = '/api/v1';

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/employees`, employeeRoutes);
app.use(`${API}/schedules`, scheduleRoutes);
app.use(`${API}/attendances`, attendanceRoutes);
app.use(`${API}/leave-requests`, leaveRoutes);
app.use(`${API}/sales-reports`, salesRoutes);
app.use(`${API}/bonuses`, bonusRoutes);
app.use(`${API}/payrolls`, payrollRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/reports`, reportRoutes);
app.use(`${API}/audit-logs`, auditLogRoutes);
app.use(`${API}/files`, fileRoutes);
app.use(`${API}/settings`, settingsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'OK', time: new Date().toISOString() }));

app.use((_req, res) => res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' }));
app.use(errorHandler);

export default app;

