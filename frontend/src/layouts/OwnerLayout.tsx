import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, ClipboardCheck,
  UmbrellaOff, TrendingUp, Gift, DollarSign, FileText,
  Bell, Shield, Settings, LogOut, Menu, X, ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';
import { useNotificationStore } from '../stores/notificationStore';

const navItems = [
  { to: '/owner/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/owner/employees', icon: Users, label: 'Karyawan' },
  { to: '/owner/schedules', icon: Calendar, label: 'Jadwal' },
  { to: '/owner/attendance', icon: ClipboardCheck, label: 'Absensi' },
  { to: '/owner/leaves', icon: UmbrellaOff, label: 'Izin & Cuti' },
  { to: '/owner/sales', icon: TrendingUp, label: 'Laporan Penjualan' },
  { to: '/owner/bonuses', icon: Gift, label: 'Bonus' },
  { to: '/owner/payroll', icon: DollarSign, label: 'Penggajian' },
  { to: '/owner/reports', icon: FileText, label: 'Laporan' },
  { to: '/owner/notifications', icon: Bell, label: 'Notifikasi' },
  { to: '/owner/audit-logs', icon: Shield, label: 'Audit Log' },
  { to: '/owner/settings', icon: Settings, label: 'Pengaturan' },
];

export const OwnerLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Fetch unread notification count
  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications?isRead=false&pageSize=1'),
    refetchInterval: 30000,
  });
  const unreadCount = notifData?.data?.data?.total ?? 0;

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      logout();
      navigate('/login');
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-blue-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
            <span className="text-primary font-bold text-lg">I</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Intan Outfit</h1>
            <p className="text-blue-200 text-xs">Management System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors relative ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            {item.to === '/owner/notifications' && unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-blue-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white text-sm font-semibold">
            {user?.employee?.fullName?.[0] ?? user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.employee?.fullName ?? 'Owner'}
            </p>
            <p className="text-blue-200 text-xs truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-blue-200 hover:text-white transition-colors"
            title="Keluar"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen-safe bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-primary flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 flex flex-col w-72 h-full bg-primary">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            <Menu size={22} />
          </button>
          <span className="font-semibold text-gray-900">Intan Outfit EMS</span>
          <NavLink to="/owner/notifications" className="relative text-gray-600">
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

