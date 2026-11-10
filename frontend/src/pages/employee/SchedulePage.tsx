import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import api from '../../lib/axios';

export const EmployeeSchedulePage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStr = format(currentMonth, 'yyyy-MM');

  const { data, isLoading } = useQuery({
    queryKey: ['my-schedule', monthStr],
    queryFn: () => api.get(`/schedules/me?month=${monthStr}`),
  });

  const schedules: any[] = data?.data?.data?.items ?? (Array.isArray(data?.data?.data) ? data?.data?.data : []);
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDow = getDay(startOfMonth(currentMonth));

  const getScheduleForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return schedules.find(s => s.date === dateStr);
  };

  const shiftColorMap: Record<string, string> = {
    'Shift Pagi': 'bg-blue-500',
    'Shift Malam': 'bg-indigo-500',
  };

  const totalShifts = schedules.length;

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Jadwal Saya</h1>
        <p className="text-gray-500 text-sm">{totalShifts} shift bulan ini</p>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
          <h2 className="font-semibold">{format(currentMonth, 'MMMM yyyy', { locale: idLocale })}</h2>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDow }).map((_, i) => <div key={i} />)}
          {days.map(day => {
            const sched = getScheduleForDate(day);
            return (
              <div key={day.toISOString()} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs relative ${isToday(day) ? 'ring-2 ring-primary' : ''}`}>
                <span className={`font-medium ${sched ? 'text-white' : 'text-gray-700'} ${sched ? (shiftColorMap[sched.shift?.name] ?? 'bg-primary') + ' w-full h-full rounded-lg flex items-center justify-center' : ''}`}>
                  {format(day, 'd')}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-3 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-full" /><span className="text-gray-600">Shift Pagi</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-indigo-500 rounded-full" /><span className="text-gray-600">Shift Malam</span></div>
        </div>
      </div>

      {/* Schedule list */}
      <div className="space-y-2">
        {schedules.length === 0 && !isLoading ? (
          <div className="text-center py-10 text-gray-400">
            <Calendar size={36} className="mx-auto mb-2 opacity-30" />
            <p>Belum ada jadwal bulan ini</p>
          </div>
        ) : (
          schedules.map((s: any) => (
            <div key={s.id} className="card p-3 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold ${shiftColorMap[s.shift?.name] ?? 'bg-primary'}`}>
                {format(new Date(s.date + 'T00:00:00'), 'd')}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{format(new Date(s.date + 'T00:00:00'), 'EEEE, d MMMM', { locale: idLocale })}</p>
                <p className="text-xs text-gray-400">{s.shift?.name} · {s.shift?.startTime} – {s.shift?.endTime}</p>
              </div>
              {s.attendance && (
                <span className={`badge ${s.attendance.status === 'ON_TIME' ? 'badge-green' : s.attendance.status === 'LATE' ? 'badge-orange' : 'badge-red'}`}>
                  {s.attendance.status === 'ON_TIME' ? '✓' : s.attendance.status === 'LATE' ? `${s.attendance.lateMinutes}m` : '✗'}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

