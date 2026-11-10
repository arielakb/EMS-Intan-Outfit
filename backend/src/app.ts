import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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

// Disable Express fingerprinting
app.disable('x-powered-by');

// Trust reverse proxy if behind one (Nginx, Traefik, Railway, etc.)
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 🛡️ Enhanced HTTP Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", env.FRONTEND_URL],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts:
      env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
  })
);

// 🛡️ Strict Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, server-to-server, curl)
      if (!requestOrigin) return callback(null, true);
      // In development allow localhost variations
      if (env.NODE_ENV !== 'production') {
        const allowedDev = [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
        if (allowedDev.includes(requestOrigin)) return callback(null, true);
      }
      if (requestOrigin === env.FRONTEND_URL) return callback(null, true);
      callback(new Error('Origin tidak diizinkan oleh kebijakan CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// 🛡️ Rate Limiting Strategies
// 1. General API Limiter: prevents volumetric DDoS and aggressive scraping
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 500, // maks 500 request / 15 menit per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan dari IP ini. Silakan coba lagi beberapa saat.' },
  skip: () => env.NODE_ENV === 'test',
});

// 2. Strict Auth Limiter: protects against automated dictionary and brute-force attacks
// In production: strict 30 attempts per 15 min. In development: 500 attempts so testing suites run smoothly.
const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: env.NODE_ENV === 'production' ? 30 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan autentikasi. Silakan tunggu 15 menit sebelum mencoba kembali.' },
  skip: () => env.NODE_ENV === 'test',
});

// 3. Password Recovery Limiter: prevents mass email spamming / enumeration
const passwordRecoveryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 5, // maks 5 permintaan per jam
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan reset password. Silakan coba lagi setelah 1 jam.' },
});

// 4. File Upload Limiter: prevents storage exhaustion
const fileUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // maks 30 upload per 15 menit
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Batas unggah tercapai. Silakan coba lagi beberapa saat.' },
});

// 🛡️ Anti-Caching for Sensitive Financial & Personal Data
app.use('/api/v1', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// 🛡️ Payload size limiting (mitigate Buffer Overflow / Memory Exhaustion)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const API = '/api/v1';

// Apply Rate Limiters
app.use(API, globalApiLimiter);
app.use(`${API}/auth/login`, strictAuthLimiter);
app.use(`${API}/auth/forgot-password`, passwordRecoveryLimiter);
app.use(`${API}/auth/reset-password`, strictAuthLimiter);
app.use(`${API}/auth/activate`, strictAuthLimiter);
app.use(`${API}/auth/change-password`, strictAuthLimiter);
app.use(`${API}/attendances/check-in`, fileUploadLimiter);

// Application API Routes
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
