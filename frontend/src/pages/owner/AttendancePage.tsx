import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Loader2, PenLine } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { formatDate, formatDateTime, getStatusBadge, getStatusLabel, getAxiosError } from '../../lib/utils';

export const OwnerAttendancePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [correcting, setCorrecting] = useState<any>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['attendances', search, dateFilter],
    queryFn: () => api.get(`/attendances?search=${search}&date=${dateFilter}&pageSize=50`),
  });

  const attendances = data?.data?.data?.items ?? [];

  const correctionMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/attendances/${id}/correction`, body),
    onSuccess: () => { toast.success('Koreksi absensi disimpan'); setCorrecting(null); qc.invalidateQueries({ queryKey: ['attendances'] }); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Absensi</h1>
        <p className="text-gray-500 text-sm">Pantau kehadiran seluruh karyawan</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Cari nama karyawan..." className="input pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input type="date" className="input sm:w-44" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        {dateFilter && <button onClick={() => setDateFilter('')} className="btn-secondary btn-sm">Reset</button>}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : attendances.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Belum ada data absensi</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Karyawan</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Tanggal & Shift</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Jam Masuk</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attendances.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{a.scheduleAssignment?.employee?.fullName ?? '-'}</p>
                      <p className="text-xs text-gray-400 md:hidden">{a.scheduleAssignment?.shift?.name}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p>{formatDate(a.scheduleAssignment?.date)}</p>
                      <p className="text-xs text-gray-400">{a.scheduleAssignment?.shift?.name}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">{a.checkInAt ? formatDateTime(a.checkInAt) : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={getStatusBadge(a.status)}>{getStatusLabel(a.status)}</span>
                      {a.lateMinutes > 0 && <p className="text-xs text-orange-500">{a.lateMinutes}m terlambat</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setCorrecting(a)} className="btn-secondary btn-sm">
                        <PenLine size={13} /> Koreksi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {correcting && (
        <CorrectionModal
          attendance={correcting}
          onClose={() => setCorrecting(null)}
          onSubmit={(body) => correctionMutation.mutate({ id: correcting.id, body })}
          isLoading={correctionMutation.isPending}
        />
      )}
    </div>
  );
};

const CorrectionModal: React.FC<{ attendance: any; onClose: () => void; onSubmit: (body: any) => void; isLoading: boolean }> = ({ attendance, onClose, onSubmit, isLoading }) => {
  const [status, setStatus] = useState(attendance.status);
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold">Koreksi Absensi</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm text-gray-500">Karyawan: <strong>{attendance.scheduleAssignment?.employee?.fullName}</strong></p>
          </div>
          <div>
            <label className="label">Status Baru</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="ON_TIME">Tepat Waktu</option>
              <option value="LATE">Terlambat</option>
              <option value="ABSENT">Absen</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
          <div>
            <label className="label">Alasan / Catatan *</label>
            <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Alasan koreksi..." />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
            <button onClick={() => onSubmit({ status, notes })} disabled={!notes || isLoading} className="btn-primary flex-1">
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Simpan Koreksi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

