import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Bell, Check } from 'lucide-react';
import api from '../../lib/axios';
import { formatDateTime } from '../../lib/utils';
import type { Notification } from '../../types';

export const EmployeeNotificationsPage: React.FC = () => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => api.get('/notifications?pageSize=30'),
  });

  const notifications: Notification[] = data?.data?.data?.items ?? [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-notifications'] }); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-notifications'] }); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifikasi</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500">{unreadCount} belum dibaca</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllMutation.mutate()} className="btn-secondary btn-sm">
            <Check size={14} /> Tandai Semua
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Bell size={36} className="mx-auto mb-2 opacity-30" />
            <p>Tidak ada notifikasi</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <div key={n.id} onClick={() => !n.isRead && markReadMutation.mutate(n.id)} className={`p-4 cursor-pointer hover:bg-gray-50 ${!n.isRead ? 'bg-blue-50/50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.isRead ? 'bg-primary' : 'bg-gray-200'}`} />
                  <div>
                    <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

