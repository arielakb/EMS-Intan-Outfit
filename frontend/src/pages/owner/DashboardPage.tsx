import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, ClipboardCheck, TrendingUp, DollarSign, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import api from '../../lib/axios';
import { formatRupiah } from '../../lib/utils';

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="card p-4 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export const OwnerDashboardPage: React.FC = () => {
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const { data, isLoading } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: () => api.get('/reports/dashboard'),
    refetchInterval: 60_000,
  });

  const { data: attendanceToday } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.get('/attendances/today'),
    refetchInterval: 60_000,
  });

  const { data: pendingLeaves } = useQuery({
    queryKey: ['leaves', 'pending'],
    queryFn: () => api.get('/leave-requests?status=PENDING&pageSize=5'),
  });

  const { data: pendingSales } = useQuery({
    queryKey: ['sales', 'pending'],
    queryFn: () => api.get('/sales-reports?status=SUBMITTED&pageSize=5'),
  });

  const todayAttendance = attendanceToday?.data?.data ?? [];
  const pendingLeaveCount = pendingLeaves?.data?.data?.total ?? 0;
  const pendingSalesCount = pendingSales?.data?.data?.total ?? 0;

  const present = todayAttendance.filter((a: any) => a.attendance).length;
  const late = todayAttendance.filter((a: any) => a.attendance?.status === 'LATE').length;
  const absent = todayAttendance.filter((a: any) => !a.attendance).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Hadir Hari Ini" value={present} icon={<CheckCircle2 size={22} className="text-green-700" />} color="bg-green-100" />
        <StatCard label="Terlambat" value={late} icon={<Clock size={22} className="text-orange-700" />} color="bg-orange-100" />
        <StatCard label="Absen" value={absent} icon={<AlertCircle size={22} className="text-red-700" />} color="bg-red-100" />
        <StatCard label="Izin Pending" value={pendingLeaveCount} icon={<ClipboardCheck size={22} className="text-blue-700" />} color="bg-blue-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today attendance */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users size={18} className="text-primary" /> Absensi Hari Ini
          </h2>
          {todayAttendance.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Belum ada jadwal hari ini</p>
          ) : (
            <div className="space-y-2">
              {todayAttendance.slice(0, 8).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.employee?.fullName}</p>
                    <p className="text-xs text-gray-400">{item.shift?.name}</p>
                  </div>
                  <div>
                    {item.attendance ? (
                      <span className={`badge ${item.attendance.status === 'LATE' ? 'badge-orange' : 'badge-green'}`}>
                        {item.attendance.status === 'ON_TIME' ? 'Tepat Waktu' : item.attendance.status === 'LATE' ? `Terlambat ${item.attendance.lateMinutes}m` : item.attendance.status}
                      </span>
                    ) : (
                      <span className="badge badge-red">Belum Absen</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending actions */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-primary" /> Perlu Tindakan
          </h2>
          <div className="space-y-3">
            <a href="/owner/leaves" className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
              <div className="flex items-center gap-3">
                <ClipboardCheck size={18} className="text-yellow-700" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Pengajuan Izin</p>
                  <p className="text-xs text-gray-500">Menunggu persetujuan</p>
                </div>
              </div>
              {pendingLeaveCount > 0 && (
                <span className="bg-yellow-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {pendingLeaveCount}
                </span>
              )}
            </a>
            <a href="/owner/sales" className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <div className="flex items-center gap-3">
                <TrendingUp size={18} className="text-blue-700" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Laporan Penjualan</p>
                  <p className="text-xs text-gray-500">Menunggu verifikasi</p>
                </div>
              </div>
              {pendingSalesCount > 0 && (
                <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {pendingSalesCount}
                </span>
              )}
            </a>
            <a href="/owner/payroll" className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <div className="flex items-center gap-3">
                <DollarSign size={18} className="text-green-700" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Penggajian</p>
                  <p className="text-xs text-gray-500">Kelola & proses gaji</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

