import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Loader2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { formatDate, formatRupiah, getStatusBadge, getStatusLabel, getAxiosError } from '../../lib/utils';

export const OwnerEmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.get(`/employees/${id}`),
  });

  const employee = data?.data?.data;

  // Initialize form when data loads
  useEffect(() => {
    if (employee && !form) setForm(employee);
  }, [employee]);

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.patch(`/employees/${id}`, body),
    onSuccess: () => { toast.success('Data karyawan diperbarui'); setEditing(false); qc.invalidateQueries({ queryKey: ['employee', id] }); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  const { data: attendData } = useQuery({
    queryKey: ['employee-attendance', id],
    queryFn: () => api.get(`/attendances?employeeId=${id}&pageSize=10`),
  });

  const { data: leaveData } = useQuery({
    queryKey: ['employee-leaves', id],
    queryFn: () => api.get(`/leave-requests?employeeId=${id}&pageSize=5`),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={30} /></div>;
  if (!employee) return <div className="p-6 text-center text-gray-400">Karyawan tidak ditemukan</div>;

  const attendances = attendData?.data?.data?.items ?? [];
  const leaves = leaveData?.data?.data?.items ?? [];

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-5 text-sm">
        <ArrowLeft size={16} /> Kembali
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile card */}
        <div className="card p-5">
          <div className="text-center mb-4">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary text-3xl font-bold mx-auto mb-3">
              {employee.fullName[0]}
            </div>
            <h2 className="font-bold text-gray-900 text-lg">{employee.fullName}</h2>
            <p className="text-gray-400 text-sm">{employee.code}</p>
            <span className={`${getStatusBadge(employee.employmentStatus)} mt-2 inline-flex`}>{getStatusLabel(employee.employmentStatus)}</span>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="label text-xs">Nama Lengkap</label>
                <input className="input text-sm" value={form?.fullName ?? ''} onChange={e => setForm((f: any) => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="label text-xs">No. HP</label>
                <input className="input text-sm" value={form?.phone ?? ''} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label text-xs">Alamat</label>
                <textarea className="input text-sm" rows={2} value={form?.address ?? ''} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="label text-xs">Status</label>
                <select className="input text-sm" value={form?.employmentStatus} onChange={e => setForm((f: any) => ({ ...f, employmentStatus: e.target.value }))}>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
                  <option value="RESIGNED">Resigned</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(false); setForm(employee); }} className="btn-secondary flex-1 btn-sm"><X size={14} /> Batal</button>
                <button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending} className="btn-primary flex-1 btn-sm">
                  {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <InfoRow label="Email" value={employee.user?.email} />
              <InfoRow label="No. HP" value={employee.phone ?? '-'} />
              <InfoRow label="Bergabung" value={formatDate(employee.joinDate)} />
              <InfoRow label="Alamat" value={employee.address ?? '-'} />
              {employee.currentShiftRate && (
                <>
                  <InfoRow label="Upah/Shift" value={formatRupiah(employee.currentShiftRate.ratePerShift)} />
                  <InfoRow label="Uang Sakit/Hari" value={formatRupiah(employee.currentShiftRate.sickPayPerDay)} />
                </>
              )}
              <button onClick={() => setEditing(true)} className="btn-secondary w-full btn-sm mt-3">
                <Pencil size={14} /> Edit Data
              </button>
            </div>
          )}
        </div>

        {/* Attendance history */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Riwayat Absensi</h3>
            {attendances.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Belum ada data absensi</p>
            ) : (
              <div className="space-y-2">
                {attendances.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                    <div>
                      <p className="text-gray-900">{formatDate(a.scheduleAssignment?.date ?? a.checkInAt)}</p>
                      <p className="text-xs text-gray-400">{a.scheduleAssignment?.shift?.name}</p>
                    </div>
                    <div className="text-right">
                      <span className={getStatusBadge(a.status)}>{getStatusLabel(a.status)}</span>
                      {a.lateMinutes > 0 && <p className="text-xs text-orange-500 mt-0.5">{a.lateMinutes} menit terlambat</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Riwayat Izin/Cuti</h3>
            {leaves.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Belum ada pengajuan izin</p>
            ) : (
              <div className="space-y-2">
                {leaves.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                    <div>
                      <p className="text-gray-900">{formatDate(l.startDate)} – {formatDate(l.endDate)}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">{l.reason}</p>
                    </div>
                    <span className={getStatusBadge(l.status)}>{getStatusLabel(l.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-2">
    <span className="text-gray-400 flex-shrink-0">{label}</span>
    <span className="text-gray-700 text-right">{value}</span>
  </div>
);

