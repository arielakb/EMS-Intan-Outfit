import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Gift } from 'lucide-react';
import api from '../../lib/axios';
import { formatDate, formatRupiah, getCurrentYearMonth } from '../../lib/utils';

export const OwnerBonusPage: React.FC = () => {
  const { year, month } = getCurrentYearMonth();
  const [filterYear, setFilterYear] = useState(year);
  const [filterMonth, setFilterMonth] = useState(month);

  const { data, isLoading } = useQuery({
    queryKey: ['bonuses', filterYear, filterMonth],
    queryFn: () => api.get(`/bonuses?year=${filterYear}&month=${filterMonth}&pageSize=100`),
  });

  const bonuses: any[] = data?.data?.data?.items ?? [];
  const totalBonus = bonuses.reduce((sum: number, b: any) => sum + Number(b.bonusAmount ?? b.amount ?? 0), 0);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Bonus</h1>
        <p className="text-gray-500 text-sm">Bonus dihitung otomatis saat laporan penjualan diverifikasi</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex gap-3 items-center">
        <select className="input w-28" value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{new Date(2000, m - 1).toLocaleDateString('id-ID', { month: 'long' })}</option>
          ))}
        </select>
        <select className="input w-24" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
          {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-400">Total Bonus</p>
          <p className="font-bold text-primary">{formatRupiah(totalBonus)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : bonuses.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Gift size={40} className="mx-auto mb-2 opacity-30" />
            <p>Belum ada bonus bulan ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Karyawan</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Tanggal</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Shift</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Penjualan</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Bonus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bonuses.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{b.employee?.fullName ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{formatDate(b.salesReport?.reportDate ?? b.calculatedAt)}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{b.shift?.name ?? b.salesReport?.shift?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{formatRupiah(b.salesReport?.grossSales ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">{formatRupiah(b.amount ?? b.bonusAmount ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

