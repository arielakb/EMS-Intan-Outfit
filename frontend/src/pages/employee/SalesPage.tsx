import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, TrendingUp, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { formatDate, formatRupiah, getStatusBadge, getStatusLabel, getAxiosError } from '../../lib/utils';

export const EmployeeSalesPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-sales'],
    queryFn: () => api.get('/sales-reports/me?pageSize=20'),
  });

  const sales = data?.data?.data?.items ?? [];

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Laporan Penjualan</h1>
          <p className="text-gray-500 text-sm">Laporkan penjualan per shift</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
          <Plus size={15} /> Input
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : sales.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <TrendingUp size={40} className="mx-auto mb-2 opacity-30" />
          <p>Belum ada laporan penjualan</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 btn-sm">Input Sekarang</button>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map((sale: any) => (
            <div key={sale.id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className={getStatusBadge(sale.status)}>{getStatusLabel(sale.status)}</span>
                  <p className="font-medium text-gray-900 mt-1">{formatDate(sale.reportDate)}</p>
                  <p className="text-xs text-gray-400">{sale.shift?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatRupiah(sale.grossSales)}</p>
                  <p className="text-xs text-gray-400">{sale.transactionCount} transaksi</p>
                </div>
              </div>
              {sale.notes && <p className="text-xs text-gray-500">Catatan: {sale.notes}</p>}
              {sale.rejectionReason && <p className="text-xs text-red-500 mt-1">Ditolak: {sale.rejectionReason}</p>}
              {sale.status === 'DRAFT' && (
                <SubmitButton saleId={sale.id} onSuccess={() => qc.invalidateQueries({ queryKey: ['my-sales'] })} />
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SalesFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['my-sales'] }); }}
        />
      )}
    </div>
  );
};

const SubmitButton: React.FC<{ saleId: string; onSuccess: () => void }> = ({ saleId, onSuccess }) => {
  const mutation = useMutation({
    mutationFn: () => api.patch(`/sales-reports/${saleId}/submit`),
    onSuccess: () => { toast.success('Laporan berhasil dikirim!'); onSuccess(); },
    onError: (err) => toast.error(getAxiosError(err)),
  });
  return (
    <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary btn-sm mt-2 w-full">
      {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Kirim untuk Verifikasi
    </button>
  );
};

const SalesFormModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ reportDate: new Date().toISOString().split('T')[0], shiftId: '', grossSales: '', netSales: '', transactionCount: '', notes: '' });

  const { data: shiftsData } = useQuery({ queryKey: ['shifts'], queryFn: () => api.get('/schedules/shifts') });
  const shifts = shiftsData?.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (body: any) => api.post('/sales-reports', body),
    onSuccess: () => { toast.success('Laporan disimpan!'); onSuccess(); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  const submitMutation = useMutation({
    mutationFn: async (body: any) => { const r = await api.post('/sales-reports', body); await api.patch(`/sales-reports/${r.data.data.id}/submit`); },
    onSuccess: () => { toast.success('Laporan berhasil dikirim!'); onSuccess(); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  const handleAction = (submit: boolean) => {
    const body = { ...form, grossSales: parseInt(form.grossSales), netSales: parseInt(form.netSales || form.grossSales), transactionCount: parseInt(form.transactionCount) };
    submit ? submitMutation.mutate(body) : saveMutation.mutate(body);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold">Input Laporan Penjualan</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Tanggal Laporan *</label>
            <input className="input" type="date" required value={form.reportDate} onChange={e => setForm(f => ({ ...f, reportDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Shift *</label>
            <select className="input" required value={form.shiftId} onChange={e => setForm(f => ({ ...f, shiftId: e.target.value }))}>
              <option value="">Pilih Shift</option>
              {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Total Penjualan (Rp) *</label>
            <input className="input" type="number" required min="0" value={form.grossSales} onChange={e => setForm(f => ({ ...f, grossSales: e.target.value }))} placeholder="Contoh: 12500000" />
          </div>
          <div>
            <label className="label">Penjualan Bersih (Rp)</label>
            <input className="input" type="number" min="0" value={form.netSales} onChange={e => setForm(f => ({ ...f, netSales: e.target.value }))} placeholder="Kosongkan jika sama dengan total" />
          </div>
          <div>
            <label className="label">Jumlah Transaksi *</label>
            <input className="input" type="number" required min="0" value={form.transactionCount} onChange={e => setForm(f => ({ ...f, transactionCount: e.target.value }))} placeholder="Jumlah transaksi" />
          </div>
          <div>
            <label className="label">Catatan (opsional)</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleAction(false)} disabled={saveMutation.isPending || submitMutation.isPending || !form.grossSales || !form.shiftId} className="btn-secondary flex-1">
              Simpan Draft
            </button>
            <button onClick={() => handleAction(true)} disabled={saveMutation.isPending || submitMutation.isPending || !form.grossSales || !form.shiftId || !form.transactionCount} className="btn-primary flex-1">
              {submitMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Kirim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

