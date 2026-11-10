import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, CheckCircle, DollarSign, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { formatRupiah, formatMonth, getStatusBadge, getStatusLabel, getAxiosError, getCurrentYearMonth } from '../../lib/utils';

export const OwnerPayrollPage: React.FC = () => {
  const { year: cy, month: cm } = getCurrentYearMonth();
  const [filterYear, setFilterYear] = useState(cy);
  const [filterMonth, setFilterMonth] = useState(cm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['payrolls', filterYear, filterMonth],
    queryFn: () => api.get(`/payrolls?year=${filterYear}&month=${filterMonth}`),
  });

  const payrolls: any[] = data?.data?.data?.items ?? [];

  const generateMutation = useMutation({
    mutationFn: () => api.post('/payrolls/generate', { year: filterYear, month: filterMonth }),
    onSuccess: () => { toast.success('Payroll berhasil digenerate!'); qc.invalidateQueries({ queryKey: ['payrolls'] }); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/payrolls/${id}/approve`),
    onSuccess: () => { toast.success('Payroll disetujui!'); qc.invalidateQueries({ queryKey: ['payrolls'] }); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Penggajian</h1>
          <p className="text-gray-500 text-sm">{formatMonth(filterYear, filterMonth)}</p>
        </div>
        <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="btn-primary">
          {generateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Generate Payroll
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

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : payrolls.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">
            <DollarSign size={40} className="mx-auto mb-2 opacity-30" />
            <p className="mb-4">Belum ada payroll bulan ini</p>
            <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="btn-primary mx-auto">
              Generate Payroll Sekarang
            </button>
          </div>
        ) : (
          payrolls.map((p: any) => (
            <PayrollCard
              key={p.id}
              payroll={p}
              expanded={expandedId === p.id}
              onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
              onApprove={() => approveMutation.mutate(p.id)}
              onPay={() => setPayingId(p.id)}
              isApproving={approveMutation.isPending}
            />
          ))
        )}
      </div>

      {payingId && (
        <PaymentModal
          payrollId={payingId}
          onClose={() => setPayingId(null)}
          onSuccess={() => { setPayingId(null); qc.invalidateQueries({ queryKey: ['payrolls'] }); }}
        />
      )}
    </div>
  );
};

const PayrollCard: React.FC<{ payroll: any; expanded: boolean; onToggle: () => void; onApprove: () => void; onPay: () => void; isApproving: boolean }> = ({ payroll, expanded, onToggle, onApprove, onPay, isApproving }) => (
  <div className="card overflow-hidden">
    <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50" onClick={onToggle}>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">{payroll.employee?.fullName}</span>
          <span className={getStatusBadge(payroll.status)}>{getStatusLabel(payroll.status)}</span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{payroll.shiftsWorked} shift · Bonus {formatRupiah(payroll.bonusAmount ?? 0)}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-gray-900">{formatRupiah(payroll.netSalary ?? payroll.totalAmount ?? 0)}</p>
        <p className="text-xs text-gray-400">Total Gaji</p>
      </div>
      {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
    </div>

    {expanded && (
      <div className="border-t border-gray-100 p-4 bg-gray-50/50">
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-400">Upah Shift ({payroll.shiftsWorked}×)</p>
            <p className="font-semibold">{formatRupiah(payroll.shiftPay ?? 0)}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-400">Uang Sakit ({payroll.sickDays} hari)</p>
            <p className="font-semibold">{formatRupiah(payroll.sickPay ?? 0)}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-400">Total Bonus</p>
            <p className="font-semibold text-green-700">{formatRupiah(payroll.bonusAmount ?? 0)}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-400">Penyesuaian</p>
            <p className="font-semibold">{formatRupiah(payroll.adjustments ?? 0)}</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          {payroll.status === 'DRAFT' && (
            <button onClick={onApprove} disabled={isApproving} className="btn-primary btn-sm">
              {isApproving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Setujui
            </button>
          )}
          {payroll.status === 'APPROVED' && (
            <button onClick={onPay} className="btn-primary btn-sm">
              <DollarSign size={14} /> Catat Pembayaran
            </button>
          )}
          {payroll.status === 'PAID' && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1"><CheckCircle size={14} /> Sudah Dibayar</span>
          )}
        </div>
      </div>
    )}
  </div>
);

const PaymentModal: React.FC<{ payrollId: string; onClose: () => void; onSuccess: () => void }> = ({ payrollId, onClose, onSuccess }) => {
  const [form, setForm] = useState({ paymentMethod: 'TRANSFER_BANK', referenceNumber: '', notes: '' });

  const { data: payrollData } = useQuery({
    queryKey: ['payroll-detail', payrollId],
    queryFn: () => api.get(`/payrolls/${payrollId}`),
  });
  const payroll = payrollData?.data?.data;

  const mutation = useMutation({
    mutationFn: (body: any) => api.post(`/payrolls/${payrollId}/payment`, body),
    onSuccess: () => { toast.success('Pembayaran dicatat!'); onSuccess(); },
    onError: (err: any) => toast.error(getAxiosError(err)),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold">Catat Pembayaran Gaji</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          {payroll && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-500">{payroll.employee?.fullName}</p>
              <p className="font-bold text-xl text-gray-900 mt-1">{formatRupiah(payroll.netSalary ?? 0)}</p>
            </div>
          )}
          <div>
            <label className="label">Metode Pembayaran</label>
            <select className="input" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
              <option value="TRANSFER_BANK">Transfer Bank</option>
              <option value="CASH">Cash</option>
              <option value="EWALLET">E-Wallet</option>
            </select>
          </div>
          <div>
            <label className="label">No. Referensi (opsional)</label>
            <input className="input" value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder="No. transfer / kode transaksi" />
          </div>
          <div>
            <label className="label">Catatan (opsional)</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
            <button onClick={() => mutation.mutate({ ...form, amount: payroll?.netSalary })} disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />} Bayar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

