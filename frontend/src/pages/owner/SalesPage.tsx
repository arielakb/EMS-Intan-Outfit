import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { formatDate, formatRupiah, getStatusBadge, getStatusLabel, getAxiosError } from '../../lib/utils';

export const OwnerSalesPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('SUBMITTED');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sales', statusFilter],
    queryFn: () => api.get(`/sales-reports?status=${statusFilter}&pageSize=50`),
  });

  const sales: any[] = data?.data?.data?.items ?? [];

  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/sales-reports/${id}/verify`, { status: 'VERIFIED' }),
    onSuccess: () => { toast.success('Laporan penjualan diverifikasi & bonus dihitung!'); qc.invalidateQueries({ queryKey: ['sales'] }); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.patch(`/sales-reports/${id}/verify`, { status: 'REJECTED', rejectionReason: reason }),
    onSuccess: () => { toast.success('Laporan ditolak'); setRejecting(null); setRejectReason(''); qc.invalidateQueries({ queryKey: ['sales'] }); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Laporan Penjualan</h1>
        <p className="text-gray-500 text-sm">Verifikasi laporan penjualan dari karyawan</p>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {[['SUBMITTED', 'Menunggu Verifikasi'], ['VERIFIED', 'Terverifikasi'], ['REJECTED', 'Ditolak'], ['', 'Semua']].map(([val, label]) => (
          <button key={val} onClick={() => setStatusFilter(val)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${statusFilter === val ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <TrendingUp size={40} className="mx-auto mb-2 opacity-30" />
            <p>Tidak ada laporan penjualan</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sales.map((sale: any) => (
              <div key={sale.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-gray-900">{sale.submittedBy?.fullName ?? '-'}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-sm text-gray-500">{sale.shift?.name}</span>
                      <span className={getStatusBadge(sale.status)}>{getStatusLabel(sale.status)}</span>
                    </div>
                    <p className="text-sm text-gray-500">{formatDate(sale.reportDate)}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Total Penjualan</p>
                        <p className="font-semibold text-gray-900">{formatRupiah(sale.grossSales)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Transaksi</p>
                        <p className="font-semibold text-gray-900">{sale.transactionCount} transaksi</p>
                      </div>
                    </div>
                    {sale.notes && <p className="text-xs text-gray-500 mt-1">Catatan: {sale.notes}</p>}
                    {sale.rejectionReason && <p className="text-xs text-red-500 mt-1">Ditolak: {sale.rejectionReason}</p>}
                  </div>
                  {sale.status === 'SUBMITTED' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => verifyMutation.mutate(sale.id)} disabled={verifyMutation.isPending} className="btn-primary btn-sm">
                        <CheckCircle size={14} /> Verifikasi
                      </button>
                      <button onClick={() => { setRejecting(sale.id); setRejectReason(''); }} className="btn btn-sm border border-red-200 text-red-600 hover:bg-red-50">
                        <XCircle size={14} /> Tolak
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rejecting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <h3 className="font-semibold mb-4">Alasan Penolakan</h3>
            <textarea className="input mb-4" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Tuliskan alasan penolakan..." />
            <div className="flex gap-3">
              <button onClick={() => setRejecting(null)} className="btn-secondary flex-1">Batal</button>
              <button onClick={() => rejectMutation.mutate({ id: rejecting, reason: rejectReason })} disabled={!rejectReason || rejectMutation.isPending} className="btn-danger flex-1">
                {rejectMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

