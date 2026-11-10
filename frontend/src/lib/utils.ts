// Shared utility functions for frontend

export function formatRupiah(amount: number | bigint | string): string {
  const num = typeof amount === 'bigint' ? Number(amount) : Number(amount);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMonth(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
}

export function getStatusBadge(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'badge-green',
    APPROVED: 'badge-green',
    PAID: 'badge-green',
    VERIFIED: 'badge-green',
    ON_TIME: 'badge-green',
    PENDING: 'badge-yellow',
    PENDING_ACTIVATION: 'badge-yellow',
    DRAFT: 'badge-yellow',
    WAITING_APPROVAL: 'badge-yellow',
    SUBMITTED: 'badge-blue',
    LATE: 'badge-orange',
    REJECTED: 'badge-red',
    INACTIVE: 'badge-gray',
    RESIGNED: 'badge-gray',
    ABSENT: 'badge-red',
    MANUAL: 'badge-blue',
  };
  return map[status] ?? 'badge-gray';
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Nonaktif',
    RESIGNED: 'Resigned',
    PENDING_ACTIVATION: 'Belum Aktif',
    PENDING: 'Menunggu',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
    DRAFT: 'Draft',
    WAITING_APPROVAL: 'Menunggu Approval',
    PAID: 'Sudah Dibayar',
    SUBMITTED: 'Diajukan',
    VERIFIED: 'Terverifikasi',
    ON_TIME: 'Tepat Waktu',
    LATE: 'Terlambat',
    ABSENT: 'Absen',
    MANUAL: 'Manual',
    TRANSFER_BANK: 'Transfer Bank',
    CASH: 'Cash',
    EWALLET: 'E-Wallet',
  };
  return map[status] ?? status;
}

export function getAxiosError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const e = err as any;
    return e.response?.data?.message ?? 'Terjadi kesalahan';
  }
  return 'Terjadi kesalahan';
}

export function getCurrentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

