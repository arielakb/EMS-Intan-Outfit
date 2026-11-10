import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { formatDate, getStatusBadge, getStatusLabel, getAxiosError } from '../../lib/utils';

export const EmployeeLeavePage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => api.get('/leave-requests/me?pageSize=20'),
  });

  const leaves = data?.data?.data?.items ?? [];

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Izin & Cuti</h1>
          <p className="text-gray-500 text-sm">Kelola pengajuan izin Anda</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
          <Plus size={15} /> Ajukan
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText size={40} className="mx-auto mb-2 opacity-30" />
          <p>Belum ada pengajuan izin</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 btn-sm">Ajukan Sekarang</button>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map((leave: any) => (
            <div key={leave.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className={getStatusBadge(leave.status)}>{getStatusLabel(leave.status)}</span>
                  <p className="font-medium text-gray-900 mt-1">{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</p>
                  <p className="text-sm text-gray-500">{leave.totalDays} hari</p>
                  <p className="text-sm text-gray-600 mt-1">{leave.reason}</p>
                  {leave.rejectionReason && <p className="text-xs text-red-500 mt-1">Alasan penolakan: {leave.rejectionReason}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <LeaveFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['my-leaves'] }); }}
        />
      )}
    </div>
  );
};

const LeaveFormModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });

  const mutation = useMutation({
    mutationFn: (body: any) => api.post('/leave-requests', body),
    onSuccess: () => { toast.success('Pengajuan izin berhasil dikirim!'); onSuccess(); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  const totalDays = form.startDate && form.endDate
    ? Math.max(1, Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold">Ajukan Izin / Cuti</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tanggal Mulai *</label>
              <input className="input" type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="label">Tanggal Selesai *</label>
              <input className="input" type="date" required value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} min={form.startDate || new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          {totalDays > 0 && <p className="text-sm text-primary font-medium">Total: {totalDays} hari</p>}
          <div>
            <label className="label">Alasan / Keterangan *</label>
            <textarea className="input" rows={3} required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Contoh: Acara keluarga, sakit, dll." />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Kirim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

