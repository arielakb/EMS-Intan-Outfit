import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { formatDate, getStatusBadge, getStatusLabel, getAxiosError } from '../../lib/utils';

export const OwnerLeavePage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', statusFilter],
    queryFn: () => api.get(`/leave-requests?status=${statusFilter}&pageSize=50`),
  });

  const leaves = data?.data?.data?.items ?? [];

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/leave-requests/${id}/review`, { status: 'APPROVED' }),
    onSuccess: () => { toast.success('Izin disetujui'); qc.invalidateQueries({ queryKey: ['leaves'] }); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.patch(`/leave-requests/${id}/review`, { status: 'REJECTED', rejectionReason: reason }),
    onSuccess: () => { toast.success('Izin ditolak'); setRejecting(null); setRejectReason(''); qc.invalidateQueries({ queryKey: ['leaves'] }); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Izin & Cuti Karyawan</h1>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {[['PENDING', 'Menunggu'], ['APPROVED', 'Disetujui'], ['REJECTED', 'Ditolak'], ['', 'Semua']].map(([val, label]) => (
          <button key={val} onClick={() => setStatusFilter(val)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === val ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Tidak ada pengajuan {statusFilter ? getStatusLabel(statusFilter).toLowerCase() : ''}</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {leaves.map((leave: any) => (
              <div key={leave.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{leave.employee?.fullName}</span>
                      <span className={getStatusBadge(leave.status)}>{getStatusLabel(leave.status)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                      <span className="text-gray-400 ml-2">({leave.totalDays} hari)</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{leave.reason}</p>
                    {leave.rejectionReason && (
                      <p className="text-xs text-red-500 mt-1">Alasan penolakan: {leave.rejectionReason}</p>
                    )}
                  </div>
                  {leave.status === 'PENDING' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setRejecting(leave.id); setRejectReason(''); }}
                        className="btn btn-sm border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle size={14} /> Tolak
                      </button>
                      <button
                        onClick={() => approveMutation.mutate(leave.id)}
                        disabled={approveMutation.isPending}
                        className="btn-primary btn-sm"
                      >
                        <CheckCircle size={14} /> Setujui
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejecting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <h3 className="font-semibold mb-4">Alasan Penolakan</h3>
            <textarea className="input mb-4" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Tuliskan alasan penolakan..." />
            <div className="flex gap-3">
              <button onClick={() => setRejecting(null)} className="btn-secondary flex-1">Batal</button>
              <button onClick={() => rejectMutation.mutate({ id: rejecting, reason: rejectReason })} disabled={!rejectReason || rejectMutation.isPending} className="btn-danger flex-1">
                {rejectMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Tolak Izin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

