import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, ClipboardCheck, UmbrellaOff,
  TrendingUp, Gift, DollarSign, User, Bell,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios';

const navItems = [
  { to: '/employee/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/employee/attendance', icon: ClipboardCheck, label: 'Absensi' },
  { to: '/employee/schedule', icon: Calendar, label: 'Jadwal' },
  { to: '/employee/leaves', icon: UmbrellaOff, label: 'Izin' },
  { to: '/employee/sales', icon: TrendingUp, label: 'Penjualan' },
];

export const EmployeeLayout: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications?isRead=false&pageSize=1'),
    refetchInterval: 60000,
  });
  const unreadCount = notifData?.data?.data?.total ?? 0;

  return (
    <div className="flex flex-col h-screen-safe bg-gray-50">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div>
          <p className="text-xs text-gray-500">Selamat datang,</p>
          <h1 className="font-semibold text-gray-900 text-sm leading-tight">
            {user?.employee?.fullName ?? 'Karyawan'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/employee/notifications" className="relative text-gray-600">
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/employee/profile">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
              {user?.employee?.fullName?.[0] ?? 'K'}
            </div>
          </NavLink>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-30">
        <div className="flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

