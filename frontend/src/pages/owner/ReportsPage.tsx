import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Download, BarChart3 } from 'lucide-react';
import api from '../../lib/axios';
import { formatRupiah, formatMonth, getCurrentYearMonth } from '../../lib/utils';

export const OwnerReportsPage: React.FC = () => {
  const { year: cy, month: cm } = getCurrentYearMonth();
  const [filterYear, setFilterYear] = useState(cy);
  const [filterMonth, setFilterMonth] = useState(cm);
  const [activeTab, setActiveTab] = useState<'attendance' | 'sales' | 'payroll'>('attendance');

  const { data: attendReport, isLoading: a1 } = useQuery({
    queryKey: ['report-attendance', filterYear, filterMonth],
    queryFn: () => api.get(`/reports/attendance?year=${filterYear}&month=${filterMonth}`),
  });

  const { data: salesReport, isLoading: a2 } = useQuery({
    queryKey: ['report-sales', filterYear, filterMonth],
    queryFn: () => api.get(`/reports/sales?year=${filterYear}&month=${filterMonth}`),
  });

  const { data: payrollReport, isLoading: a3 } = useQuery({
    queryKey: ['report-payroll', filterYear, filterMonth],
    queryFn: () => api.get(`/reports/payroll?year=${filterYear}&month=${filterMonth}`),
  });

  const isLoading = a1 || a2 || a3;
  const attendData = attendReport?.data?.data ?? [];
  const salesData = salesReport?.data?.data ?? {};
  const payrollData = payrollReport?.data?.data ?? [];

  const handleExport = async (type: string) => {
    try {
      const res = await api.get(`/reports/export/${type}?year=${filterYear}&month=${filterMonth}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-${type}-${filterYear}-${filterMonth}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Gagal export laporan');
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
          <p className="text-gray-500 text-sm">{formatMonth(filterYear, filterMonth)}</p>
        </div>
        <button onClick={() => handleExport(activeTab)} className="btn-secondary">
          <Download size={16} /> Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex gap-3">
        <select className="input w-28" value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{new Date(2000, m - 1).toLocaleDateString('id-ID', { month: 'long' })}</option>
          ))}
        </select>
        <select className="input w-24" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
          {[cy - 1, cy, cy + 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {(['attendance', 'sales', 'payroll'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'attendance' ? 'Absensi' : tab === 'sales' ? 'Penjualan' : 'Penggajian'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : (
        <>
          {activeTab === 'attendance' && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Karyawan</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Hadir</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Terlambat</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Absen</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Izin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {attendData.map((row: any) => (
                      <tr key={row.employeeId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{row.fullName}</td>
                        <td className="px-4 py-3 text-center text-green-700 font-semibold">{row.present ?? 0}</td>
                        <td className="px-4 py-3 text-center text-orange-500">{row.late ?? 0}</td>
                        <td className="px-4 py-3 text-center text-red-500">{row.absent ?? 0}</td>
                        <td className="px-4 py-3 text-center text-blue-500">{row.leave ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {attendData.length === 0 && <p className="text-center py-10 text-gray-400">Tidak ada data</p>}
              </div>
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Total Penjualan', value: formatRupiah(salesData.totalGrossSales ?? 0) },
                  { label: 'Penjualan Bersih', value: formatRupiah(salesData.totalNetSales ?? 0) },
                  { label: 'Total Transaksi', value: (salesData.totalTransactions ?? 0).toLocaleString() },
                  { label: 'Total Bonus', value: formatRupiah(salesData.totalBonus ?? 0) },
                ].map(({ label, value }) => (
                  <div key={label} className="card p-4">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-bold text-gray-900 text-lg mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Karyawan</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Shift</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Upah Shift</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Bonus</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payrollData.map((row: any) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{row.employee?.fullName}</td>
                        <td className="px-4 py-3 text-center text-gray-500 hidden md:table-cell">{row.shiftsWorked}</td>
                        <td className="px-4 py-3 text-right text-gray-600 hidden lg:table-cell">{formatRupiah(row.shiftPay ?? 0)}</td>
                        <td className="px-4 py-3 text-right text-green-700 hidden lg:table-cell">{formatRupiah(row.bonusAmount ?? 0)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-primary">{formatRupiah(row.netSalary ?? row.totalAmount ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payrollData.length === 0 && <p className="text-center py-10 text-gray-400">Tidak ada data</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

