import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Bell, Check } from 'lucide-react';
import api from '../../lib/axios';
import { formatDateTime, getStatusBadge } from '../../lib/utils';
import type { Notification } from '../../types';

export const OwnerNotificationsPage: React.FC = () => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-all'],
    queryFn: () => api.get('/notifications?pageSize=50'),
  });

  const notifications: Notification[] = data?.data?.data?.items ?? [];

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['notifications-all'] }); },
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifikasi</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500">{unreadCount} belum dibaca</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending} className="btn-secondary btn-sm">
            <Check size={14} /> Tandai Semua Dibaca
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Bell size={40} className="mx-auto mb-2 opacity-30" />
            <p>Belum ada notifikasi</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <div key={n.id} className={`p-4 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`} onClick={() => !n.isRead && markReadMutation.mutate(n.id)}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.isRead ? 'bg-primary' : 'bg-gray-200'}`} />
                  <div className="flex-1">
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

