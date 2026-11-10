import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
});
type FormData = z.infer<typeof schema>;

export const ForgotPasswordPage: React.FC = () => {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/forgot-password', data);
      setSent(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Gagal mengirim email');
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-sm w-full">
          <Mail className="text-primary mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Email Terkirim</h2>
          <p className="text-gray-500 text-sm mb-6">
            Instruksi reset password telah dikirim. Silakan cek inbox email Anda.
          </p>
          <Link to="/login" className="btn-primary w-full inline-flex justify-center">
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link to="/login" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm">
          <ArrowLeft size={16} /> Kembali ke Login
        </Link>

        <div className="card p-6">
          <h2 className="text-lg font-bold mb-1">Lupa Password</h2>
          <p className="text-gray-500 text-sm mb-6">Masukkan email Anda untuk mendapatkan link reset password.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="email@intanoutfit.com" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full btn-lg">
              {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Mengirim...</> : 'Kirim Link Reset'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

