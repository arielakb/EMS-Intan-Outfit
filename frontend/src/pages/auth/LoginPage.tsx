import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type FormData = z.infer<typeof schema>;

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data);
      const dataPayload = res.data.data;
      const user = dataPayload.user;
      const tokens = dataPayload.tokens ?? {
        accessToken: dataPayload.accessToken,
        refreshToken: dataPayload.refreshToken,
      };
      login(user, tokens);

      toast.success(`Selamat datang, ${user.employee?.fullName ?? user.name ?? user.email}!`);

      if (user.role === 'OWNER') {
        navigate('/owner/dashboard', { replace: true });
      } else {
        navigate('/employee/dashboard', { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Login gagal, coba lagi';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg mb-4">
            <span className="text-white font-bold text-3xl">I</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Intan Outfit</h1>
          <p className="text-gray-500 text-sm mt-1">Sistem Manajemen Karyawan</p>
        </div>

        {/* Form */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Masuk ke Akun</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="email@intanoutfit.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Lupa password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full btn-lg"
            >
              {isSubmitting ? (
                <><Loader2 size={18} className="animate-spin" /> Memproses...</>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2025 Intan Outfit. All rights reserved.
        </p>
      </div>
    </div>
  );
};

