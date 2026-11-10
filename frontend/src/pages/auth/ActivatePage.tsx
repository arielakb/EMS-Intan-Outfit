import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';

const schema = z.object({
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export const ActivatePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/activate', { token, password: data.password });
      setDone(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Aktivasi gagal');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-6 text-center max-w-sm w-full">
          <p className="text-red-500">Token aktivasi tidak valid atau sudah kadaluarsa.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-sm w-full">
          <CheckCircle className="text-success mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Akun Aktif!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Password berhasil diatur. Silakan login menggunakan email dan password baru Anda.
          </p>
          <button onClick={() => navigate('/login')} className="btn-primary w-full">
            Ke Halaman Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-primary rounded-2xl shadow-lg items-center justify-center mb-4">
            <span className="text-white font-bold text-3xl">I</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Aktivasi Akun</h1>
          <p className="text-gray-500 text-sm mt-1">Buat password untuk akun Anda</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Password Baru</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Minimal 8 karakter"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Konfirmasi Password</label>
              <input
                {...register('confirmPassword')}
                type="password"
                className="input"
                placeholder="Ulangi password"
              />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full btn-lg">
              {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Memproses...</> : 'Aktifkan Akun'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

