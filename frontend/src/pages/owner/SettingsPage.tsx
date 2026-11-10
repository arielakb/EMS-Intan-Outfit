import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { getAxiosError, formatRupiah } from '../../lib/utils';

export const OwnerSettingsPage: React.FC = () => {
  const qc = useQueryClient();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  });

  const { data: bonusData } = useQuery({
    queryKey: ['bonus-policy'],
    queryFn: () => api.get('/bonuses/policy'),
  });

  const { data: shiftsData } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => api.get('/schedules/shifts'),
  });

  const settings = settingsData?.data?.data ?? [];
  const bonusPolicy = bonusData?.data?.data;
  const shifts = shiftsData?.data?.data ?? [];

  const [bonusForm, setBonusForm] = useState({ thresholdAmount: '', bonusPerThreshold: '' });
  const [shiftRateForm, setShiftRateForm] = useState<Record<string, { ratePerShift: string; sickPayPerDay: string }>>({});

  const updateSettingMutation = useMutation({
    mutationFn: (body: any) => api.patch('/settings', body),
    onSuccess: () => { toast.success('Pengaturan disimpan'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  const updateBonusMutation = useMutation({
    mutationFn: (body: any) => api.post('/bonuses/policy', body),
    onSuccess: () => { toast.success('Kebijakan bonus diperbarui'); qc.invalidateQueries({ queryKey: ['bonus-policy'] }); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Sistem</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : (
        <div className="space-y-5">
          {/* Bonus Policy */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings size={18} className="text-primary" /> Kebijakan Bonus
            </h2>
            {bonusPolicy && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
                <p className="text-gray-600">Kebijakan aktif: Setiap kelipatan <strong>{formatRupiah(bonusPolicy.thresholdAmount)}</strong> penjualan → bonus <strong>{formatRupiah(bonusPolicy.bonusPerThreshold)}</strong> per karyawan</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Target Penjualan (Rp)</label>
                <input className="input" type="number" placeholder={bonusPolicy?.thresholdAmount ?? '5000000'} value={bonusForm.thresholdAmount} onChange={e => setBonusForm(f => ({ ...f, thresholdAmount: e.target.value }))} />
              </div>
              <div>
                <label className="label">Bonus per Target (Rp)</label>
                <input className="input" type="number" placeholder={bonusPolicy?.bonusPerThreshold ?? '50000'} value={bonusForm.bonusPerThreshold} onChange={e => setBonusForm(f => ({ ...f, bonusPerThreshold: e.target.value }))} />
              </div>
            </div>
            <button
              onClick={() => updateBonusMutation.mutate({ thresholdAmount: parseInt(bonusForm.thresholdAmount), bonusPerThreshold: parseInt(bonusForm.bonusPerThreshold) })}
              disabled={!bonusForm.thresholdAmount || !bonusForm.bonusPerThreshold || updateBonusMutation.isPending}
              className="btn-primary mt-4"
            >
              {updateBonusMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Kebijakan Bonus
            </button>
          </div>

          {/* Shifts */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Informasi Shift</h2>
            <div className="space-y-2">
              {shifts.map((shift: any) => (
                <div key={shift.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{shift.name}</p>
                    <p className="text-sm text-gray-500">{shift.startTime} – {shift.endTime} · Maks {shift.maxEmployees} karyawan</p>
                  </div>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: shift.color }} />
                </div>
              ))}
            </div>
          </div>

          {/* System settings */}
          {settings.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Pengaturan Sistem</h2>
              <div className="space-y-3">
                {settings.map((s: any) => (
                  <div key={s.key} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{s.key.replace(/_/g, ' ')}</p>
                      {s.description && <p className="text-xs text-gray-400">{s.description}</p>}
                    </div>
                    <input className="input w-32 text-right" defaultValue={s.value} onBlur={(e) => { if (e.target.value !== s.value) updateSettingMutation.mutate({ key: s.key, value: e.target.value }); }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

