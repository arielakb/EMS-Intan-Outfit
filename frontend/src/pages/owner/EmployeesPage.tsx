import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, Search, Eye, Pencil, UserX, Mail, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { formatDate, getStatusBadge, getStatusLabel, getAxiosError } from '../../lib/utils';
import type { Employee } from '../../types';

export const OwnerEmployeesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn: () => api.get(`/employees?search=${search}&pageSize=50`),
    placeholderData: keepPreviousData,
  });

  const employees: Employee[] = data?.data?.data?.items ?? [];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Karyawan</h1>
          <p className="text-gray-500 text-sm">{employees.length} karyawan terdaftar</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Tambah Karyawan
        </button>
      </div>

      {/* Search */}
      <div className="card p-4 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama, kode, atau email karyawan..."
            className="input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : employees.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <UserX size={40} className="mx-auto mb-2 opacity-30" />
            <p>Belum ada karyawan{search ? ' yang sesuai pencarian' : ''}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Karyawan</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Kode</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Bergabung</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                          {emp.fullName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{emp.fullName}</p>
                          <p className="text-xs text-gray-400">{emp.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600">{emp.code}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500">{formatDate(emp.joinDate)}</td>
                    <td className="px-4 py-3">
                      <span className={getStatusBadge(emp.employmentStatus)}>{getStatusLabel(emp.employmentStatus)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/owner/employees/${emp.id}`)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Eye size={14} /> Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAdd && <AddEmployeeModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); qc.invalidateQueries({ queryKey: ['employees'] }); }} />}
    </div>
  );
};

const AddEmployeeModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', address: '', joinDate: new Date().toISOString().split('T')[0], ratePerShift: '', sickPayPerDay: '' });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/employees', data),
    onSuccess: () => { toast.success('Karyawan berhasil ditambahkan! Email aktivasi telah dikirim.'); onSuccess(); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      ratePerShift: parseInt(form.ratePerShift),
      sickPayPerDay: parseInt(form.sickPayPerDay),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Tambah Karyawan Baru</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Nama Lengkap *</label>
            <input className="input" required value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Nama karyawan" />
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
          </div>
          <div>
            <label className="label">No. HP</label>
            <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08xxx" />
          </div>
          <div>
            <label className="label">Tanggal Bergabung *</label>
            <input className="input" type="date" required value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Upah per Shift (Rp) *</label>
            <input className="input" type="number" required min="0" value={form.ratePerShift} onChange={e => setForm(f => ({ ...f, ratePerShift: e.target.value }))} placeholder="Contoh: 85000" />
          </div>
          <div>
            <label className="label">Uang Sakit per Hari (Rp) *</label>
            <input className="input" type="number" required min="0" value={form.sickPayPerDay} onChange={e => setForm(f => ({ ...f, sickPayPerDay: e.target.value }))} placeholder="Contoh: 50000" />
          </div>
          <div>
            <label className="label">Alamat</label>
            <textarea className="input" rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Alamat lengkap" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

