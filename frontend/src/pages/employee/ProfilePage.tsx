import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Camera, Save, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { formatDate, getAxiosError } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';

export const EmployeeProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const qc = useQueryClient();
  const [editingPassword, setEditingPassword] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const { data } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/auth/me'),
  });

  const employee = data?.data?.data?.employee;

  const changePasswordMutation = useMutation({
    mutationFn: (body: any) => api.patch('/auth/change-password', body),
    onSuccess: () => { toast.success('Password berhasil diubah'); setEditingPassword(false); setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) { toast.error('Password baru tidak cocok'); return; }
    if (passForm.newPassword.length < 8) { toast.error('Password minimal 8 karakter'); return; }
    changePasswordMutation.mutate({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
  };

  const logout = useAuthStore(s => s.logout);
  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } finally { logout(); window.location.href = '/login'; }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Profil Saya</h1>
      </div>

      {/* Avatar + name */}
      <div className="card p-5 text-center mb-4">
        <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary text-3xl font-bold mx-auto mb-3">
          {employee?.fullName?.[0] ?? user?.email?.[0]?.toUpperCase()}
        </div>
        <h2 className="font-bold text-gray-900 text-lg">{employee?.fullName ?? '-'}</h2>
        <p className="text-gray-400 text-sm">{employee?.code}</p>
        <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
      </div>

      {/* Info */}
      <div className="card p-5 mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">Informasi Karyawan</h3>
        <div className="space-y-2 text-sm">
          <InfoRow label="No. HP" value={employee?.phone ?? '-'} />
          <InfoRow label="Alamat" value={employee?.address ?? '-'} />
          <InfoRow label="Tanggal Bergabung" value={employee?.joinDate ? formatDate(employee.joinDate) : '-'} />
          <InfoRow label="Status" value={employee?.employmentStatus === 'ACTIVE' ? '✅ Aktif' : employee?.employmentStatus ?? '-'} />
        </div>
      </div>

      {/* Change password */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Ubah Password</h3>
          <button onClick={() => setEditingPassword(v => !v)} className="text-primary text-sm font-medium">
            {editingPassword ? 'Batal' : 'Ubah'}
          </button>
        </div>

        {editingPassword && (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="label">Password Lama</label>
              <div className="relative">
                <input className="input pr-10" type={showPass ? 'text' : 'password'} required value={passForm.currentPassword} onChange={e => setPassForm(f => ({ ...f, currentPassword: e.target.value }))} />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Password Baru</label>
              <input className="input" type="password" required min={8} value={passForm.newPassword} onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Minimal 8 karakter" />
            </div>
            <div>
              <label className="label">Konfirmasi Password Baru</label>
              <input className="input" type="password" required value={passForm.confirmPassword} onChange={e => setPassForm(f => ({ ...f, confirmPassword: e.target.value }))} />
            </div>
            <button type="submit" disabled={changePasswordMutation.isPending} className="btn-primary w-full">
              {changePasswordMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Password
            </button>
          </form>
        )}
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="btn-danger w-full">Keluar dari Akun</button>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between gap-2 py-1 border-b border-gray-50 last:border-0">
    <span className="text-gray-400">{label}</span>
    <span className="text-gray-700 text-right">{value}</span>
  </div>
);

