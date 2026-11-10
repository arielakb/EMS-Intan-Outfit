import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Gift } from 'lucide-react';
import api from '../../lib/axios';
import { formatDate, formatRupiah, getCurrentYearMonth } from '../../lib/utils';

export const EmployeeBonusPage: React.FC = () => {
  const { year, month } = getCurrentYearMonth();

  const { data, isLoading } = useQuery({
    queryKey: ['my-bonuses'],
    queryFn: () => api.get(`/bonuses/me?year=${year}&month=${month}&pageSize=50`),
  });

  const bonuses: any[] = data?.data?.data?.items ?? [];
  const totalBonus = bonuses.reduce((s, b) => s + Number(b.amount ?? 0), 0);

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Bonus Saya</h1>
        <p className="text-gray-500 text-sm">Bonus dihitung berdasarkan penjualan shift Anda</p>
      </div>

      {/* Total card */}
      <div className="card p-5 mb-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <Gift size={28} className="mb-2 opacity-80" />
        <p className="text-green-100 text-sm">Total Bonus Bulan Ini</p>
        <p className="text-3xl font-bold mt-1">{formatRupiah(totalBonus)}</p>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">Rincian Bonus</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : bonuses.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Gift size={36} className="mx-auto mb-2 opacity-30" />
            <p>Belum ada bonus bulan ini</p>
            <p className="text-xs mt-1">Bonus dihitung saat laporan penjualan diverifikasi</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {bonuses.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatDate(b.salesReport?.reportDate ?? b.calculatedAt)}</p>
                  <p className="text-xs text-gray-400">{b.shift?.name ?? b.salesReport?.shift?.name} · Penjualan {formatRupiah(b.salesReport?.grossSales ?? 0)}</p>
                </div>
                <p className="font-bold text-green-700">+{formatRupiah(b.amount ?? 0)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

