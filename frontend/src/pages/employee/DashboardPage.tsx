import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { ClipboardCheck, Calendar, TrendingUp, Gift, DollarSign, ChevronRight } from 'lucide-react';
import api from '../../lib/axios';
import { formatRupiah, formatDate, getStatusBadge, getStatusLabel } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';

export const EmployeeDashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  const { data: todayData } = useQuery({
    queryKey: ['employee-today'],
    queryFn: () => api.get('/attendances/me?limit=1'),
    refetchInterval: 60_000,
  });

  const { data: scheduleData } = useQuery({
    queryKey: ['employee-schedule-today'],
    queryFn: () => api.get(`/schedules/me?date=${new Date().toISOString().split('T')[0]}`),
  });

  const { data: bonusData } = useQuery({
    queryKey: ['employee-bonus-this-month'],
    queryFn: () => {
      const now = new Date();
      return api.get(`/bonuses/me?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
    },
  });

  const { data: payrollData } = useQuery({
    queryKey: ['employee-payroll-latest'],
    queryFn: () => api.get('/payrolls/me?pageSize=1'),
  });

  const todayAttendances = todayData?.data?.data?.items ?? [];
  const hasCheckedIn = todayAttendances.length > 0;
  const todayAttendance = todayAttendances[0];

  const todaySchedules = scheduleData?.data?.data?.items ?? (Array.isArray(scheduleData?.data?.data) ? scheduleData.data.data : []);
  const todaySchedule = todaySchedules[0];

  const totalBonus = (bonusData?.data?.data?.items ?? []).reduce((s: number, b: any) => s + Number(b.amount ?? 0), 0);
  const latestPayroll = (payrollData?.data?.data?.items ?? [])[0];

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Selamat Pagi' : now.getHours() < 17 ? 'Selamat Siang' : 'Selamat Malam';

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Welcome */}
      <div className="mb-5">
        <p className="text-gray-500 text-sm">{greeting},</p>
        <h1 className="text-xl font-bold text-gray-900">{user?.employee?.fullName ?? 'Karyawan'} 👋</h1>
        <p className="text-sm text-gray-400">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Today shift & attendance */}
      <div className="card p-4 mb-4 bg-gradient-to-r from-primary to-primary-dark text-white">
        <p className="text-blue-100 text-xs font-medium mb-2">JADWAL HARI INI</p>
        {todaySchedule ? (
          <div>
            <p className="font-semibold text-lg">{todaySchedule.shift?.name}</p>
            <p className="text-blue-100 text-sm">{todaySchedule.shift?.startTime} – {todaySchedule.shift?.endTime}</p>
          </div>
        ) : (
          <p className="text-blue-100">Tidak ada jadwal hari ini</p>
        )}

        <div className="mt-3 pt-3 border-t border-blue-400">
          {hasCheckedIn ? (
            <div className="flex items-center gap-2">
              <ClipboardCheck size={16} className="text-green-300" />
              <span className="text-sm">
                Sudah absen — <span className={todayAttendance?.status === 'LATE' ? 'text-orange-300' : 'text-green-300'}>{getStatusLabel(todayAttendance?.status)}</span>
                {todayAttendance?.lateMinutes > 0 && ` (${todayAttendance.lateMinutes}m terlambat)`}
              </span>
            </div>
          ) : todaySchedule ? (
            <NavLink to="/employee/attendance" className="inline-flex items-center gap-2 bg-white text-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50">
              <ClipboardCheck size={16} /> Absen Sekarang
            </NavLink>
          ) : (
            <p className="text-blue-200 text-sm">Nikmati hari libur Anda! 😊</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-4">
          <Gift size={20} className="text-primary mb-2" />
          <p className="text-xs text-gray-400">Bonus Bulan Ini</p>
          <p className="font-bold text-gray-900">{formatRupiah(totalBonus)}</p>
        </div>
        <div className="card p-4">
          <DollarSign size={20} className="text-primary mb-2" />
          <p className="text-xs text-gray-400">Gaji Terakhir</p>
          <p className="font-bold text-gray-900">{latestPayroll ? formatRupiah(latestPayroll.netSalary ?? latestPayroll.totalAmount ?? 0) : '-'}</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="card divide-y divide-gray-50">
        {[
          { to: '/employee/schedule', icon: Calendar, label: 'Lihat Jadwal Lengkap' },
          { to: '/employee/leaves', icon: ClipboardCheck, label: 'Ajukan Izin / Cuti' },
          { to: '/employee/sales', icon: TrendingUp, label: 'Input Laporan Penjualan' },
          { to: '/employee/payroll', icon: DollarSign, label: 'Lihat Slip Gaji' },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Icon size={18} className="text-primary" />
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </NavLink>
        ))}
      </div>
    </div>
  );
};

