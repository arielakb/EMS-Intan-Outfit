import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Shield } from 'lucide-react';
import api from '../../lib/axios';
import { formatDateTime } from '../../lib/utils';
import type { AuditLog } from '../../types';

export const OwnerAuditLogPage: React.FC = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => api.get(`/audit-logs?page=${page}&pageSize=20`),
  });

  const logs: AuditLog[] = data?.data?.data?.items ?? [];
  const total = data?.data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 text-sm">Rekam jejak semua perubahan data penting</p>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Shield size={40} className="mx-auto mb-2 opacity-30" />
            <p>Belum ada audit log</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Waktu</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Pengguna</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Aksi</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Entitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{log.user?.email ?? '-'}</p>
                        <p className="text-xs text-gray-400">{log.user?.role}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono">{log.action}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-500">
                        <span className="text-xs">{log.entityType} / {log.entityId?.slice(0, 8)}…</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">← Sebelumnya</button>
                <span className="text-sm text-gray-500">Halaman {page} dari {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary btn-sm">Berikutnya →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

