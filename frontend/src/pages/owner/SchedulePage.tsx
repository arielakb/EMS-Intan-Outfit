import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Loader2, Trash2 } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { getAxiosError } from '../../lib/utils';

export const OwnerSchedulePage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAssign, setShowAssign] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const qc = useQueryClient();

  const monthStr = format(currentMonth, 'yyyy-MM');
  const { data, isLoading } = useQuery({
    queryKey: ['schedules', monthStr],
    queryFn: () => api.get(`/schedules?month=${monthStr}&pageSize=200`),
  });

  const schedules: any[] = data?.data?.data?.items ?? (Array.isArray(data?.data?.data) ? data?.data?.data : []);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDow = getDay(startOfMonth(currentMonth)); // 0=Sun

  const getSchedulesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.filter((s) => s.date === dateStr);
  };

  const shiftColors: Record<string, string> = {
    'Shift Pagi': 'bg-blue-100 text-blue-800',
    'Shift Malam': 'bg-indigo-100 text-indigo-800',
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jadwal Kerja</h1>
          <p className="text-gray-500 text-sm">{format(currentMonth, 'MMMM yyyy', { locale: idLocale })}</p>
        </div>
        <button onClick={() => { setSelectedDate(format(new Date(), 'yyyy-MM-dd')); setShowAssign(true); }} className="btn-primary">
          <Plus size={16} /> Assign Jadwal
        </button>
      </div>

      {/* Month nav */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="btn-secondary btn-sm"><ChevronLeft size={16} /></button>
          <h2 className="font-semibold text-gray-900">{format(currentMonth, 'MMMM yyyy', { locale: idLocale })}</h2>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="btn-secondary btn-sm"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">
        {/* DOW headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : (
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {Array.from({ length: startDow }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[90px] border-b border-r border-gray-50 bg-gray-50/50" />
            ))}

            {days.map((day) => {
              const daySchedules = getSchedulesForDate(day);
              const dateStr = format(day, 'yyyy-MM-dd');
              return (
                <div
                  key={dateStr}
                  onClick={() => { setSelectedDate(dateStr); setShowAssign(true); }}
                  className={`min-h-[90px] border-b border-r border-gray-50 p-1.5 cursor-pointer hover:bg-blue-50/50 transition-colors ${isToday(day) ? 'bg-blue-50' : ''}`}
                >
                  <span className={`inline-flex w-6 h-6 items-center justify-center text-xs font-medium rounded-full mb-1 ${isToday(day) ? 'bg-primary text-white' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="space-y-0.5">
                    {daySchedules.slice(0, 3).map((s) => (
                      <div key={s.id} className={`text-xs px-1 py-0.5 rounded truncate ${shiftColors[s.shift?.name] ?? 'bg-gray-100 text-gray-700'}`}>
                        {s.employee?.fullName?.split(' ')[0]}
                      </div>
                    ))}
                    {daySchedules.length > 3 && <div className="text-xs text-gray-400">+{daySchedules.length - 3} lagi</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAssign && (
        <AssignScheduleModal
          date={selectedDate}
          onClose={() => setShowAssign(false)}
          onSuccess={() => { setShowAssign(false); qc.invalidateQueries({ queryKey: ['schedules'] }); }}
          existingSchedules={schedules.filter(s => s.date === selectedDate)}
        />
      )}
    </div>
  );
};

const AssignScheduleModal: React.FC<{ date: string; onClose: () => void; onSuccess: () => void; existingSchedules: any[] }> = ({ date, onClose, onSuccess, existingSchedules }) => {
  const [form, setForm] = useState({ employeeId: '', shiftId: '' });
  const qc = useQueryClient();

  const { data: employees } = useQuery({ queryKey: ['employees-active'], queryFn: () => api.get('/employees?status=ACTIVE&pageSize=100') });
  const { data: shifts } = useQuery({ queryKey: ['shifts'], queryFn: () => api.get('/schedules/shifts') });

  const empList = employees?.data?.data?.items ?? [];
  const shiftList = shifts?.data?.data ?? [];

  const addMutation = useMutation({
    mutationFn: (body: any) => api.post('/schedules', body),
    onSuccess: () => { toast.success('Jadwal ditambahkan'); qc.invalidateQueries({ queryKey: ['schedules'] }); setForm({ employeeId: '', shiftId: '' }); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/schedules/${id}`),
    onSuccess: () => { toast.success('Jadwal dihapus'); qc.invalidateQueries({ queryKey: ['schedules'] }); },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Jadwal — {new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5">
          {/* Existing schedules */}
          {existingSchedules.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Jadwal saat ini:</p>
              <div className="space-y-2">
                {existingSchedules.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{s.employee?.fullName}</span>
                      <span className="text-gray-400 ml-2">— {s.shift?.name}</span>
                    </div>
                    <button onClick={() => deleteMutation.mutate(s.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new */}
          <p className="text-sm font-medium text-gray-700 mb-3">Tambah jadwal:</p>
          <div className="space-y-3">
            <select className="input" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}>
              <option value="">Pilih Karyawan</option>
              {empList.map((e: any) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>
            <select className="input" value={form.shiftId} onChange={e => setForm(f => ({ ...f, shiftId: e.target.value }))}>
              <option value="">Pilih Shift</option>
              {shiftList.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
            </select>
            <button
              onClick={() => addMutation.mutate({ date, employeeIds: [form.employeeId], shiftId: form.shiftId })}
              disabled={!form.employeeId || !form.shiftId || addMutation.isPending}
              className="btn-primary w-full"
            >
              {addMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Tambahkan
            </button>
          </div>
          <button onClick={onSuccess} className="btn-secondary w-full mt-3">Selesai</button>
        </div>
      </div>
    </div>
  );
};

