import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, CheckCircle2, AlertCircle, FlipHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { formatDate, formatDateTime, getStatusBadge, getStatusLabel, getAxiosError } from '../../lib/utils';

export const EmployeeAttendancePage: React.FC = () => {
  const [showCamera, setShowCamera] = useState(false);
  const qc = useQueryClient();

  // Check if already checked in today
  const { data: todayData } = useQuery({
    queryKey: ['attendance-me-today'],
    queryFn: () => api.get('/attendances/me?limit=10'),
    refetchInterval: 30_000,
  });

  const { data: historyData } = useQuery({
    queryKey: ['attendance-history'],
    queryFn: () => api.get('/attendances/me?pageSize=20'),
  });

  const today = new Date().toISOString().split('T')[0];
  const attendances = todayData?.data?.data?.items ?? [];
  const hasCheckedInToday = attendances.some((a: any) => a.scheduleAssignment?.date === today);

  const history = historyData?.data?.data?.items ?? [];

  const checkinMutation = useMutation({
    mutationFn: (formData: FormData) => api.post('/attendances/check-in', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      toast.success('Absensi berhasil dicatat!');
      setShowCamera(false);
      qc.invalidateQueries({ queryKey: ['attendance-me-today'] });
      qc.invalidateQueries({ queryKey: ['attendance-history'] });
    },
    onError: (err) => toast.error(getAxiosError(err)),
  });

  const handleCapture = (blob: Blob) => {
    const fd = new FormData();
    fd.append('selfie', blob, 'selfie.jpg');
    checkinMutation.mutate(fd);
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Absensi</h1>
        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Check-in card */}
      <div className="card p-5 mb-4">
        {hasCheckedInToday ? (
          <div className="text-center py-4">
            <CheckCircle2 size={48} className="text-success mx-auto mb-3" />
            <p className="font-semibold text-gray-900">Anda sudah absen hari ini</p>
            <p className="text-gray-400 text-sm mt-1">Terima kasih telah hadir tepat waktu!</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <Camera size={36} className="text-primary" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">Ambil Foto Selfie</h2>
            <p className="text-gray-500 text-sm mb-5">Pastikan wajah Anda terlihat jelas saat mengambil foto</p>
            <button onClick={() => setShowCamera(true)} className="btn-primary btn-lg w-full">
              <Camera size={18} /> Mulai Absen
            </button>
          </div>
        )}
      </div>

      {/* History */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Riwayat Absensi</h3>
        </div>
        {history.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">Belum ada riwayat absensi</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatDate(a.scheduleAssignment?.date ?? a.checkInAt)}</p>
                  <p className="text-xs text-gray-400">{a.scheduleAssignment?.shift?.name} · {a.checkInAt ? formatDateTime(a.checkInAt) : '-'}</p>
                </div>
                <div className="text-right">
                  <span className={getStatusBadge(a.status)}>{getStatusLabel(a.status)}</span>
                  {a.lateMinutes > 0 && <p className="text-xs text-orange-500 mt-0.5">{a.lateMinutes}m terlambat</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Camera modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
          isLoading={checkinMutation.isPending}
        />
      )}
    </div>
  );
};

const CameraCapture: React.FC<{ onCapture: (blob: Blob) => void; onClose: () => void; isLoading: boolean }> = ({ onCapture, onClose, isLoading }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [captured, setCaptured] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');

  const startCamera = useCallback(async () => {
    setError('');
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.');
    }
  }, [facingMode]);

  useEffect(() => { startCamera(); return () => streamRef.current?.getTracks().forEach(t => t.stop()); }, [startCamera]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        setCaptured(canvas.toDataURL('image/jpeg', 0.8));
      }
    }, 'image/jpeg', 0.8);
  };

  const retake = () => { setCaptured(null); setCapturedBlob(null); startCamera(); };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/50">
        <button onClick={onClose} className="text-white text-sm font-medium">Batal</button>
        <p className="text-white font-medium">Foto Selfie Absensi</p>
        {!captured && (
          <button onClick={() => setFacingMode(m => m === 'user' ? 'environment' : 'user')} className="text-white">
            <FlipHorizontal size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div>
              <AlertCircle size={48} className="text-red-400 mx-auto mb-3" />
              <p className="text-white">{error}</p>
            </div>
          </div>
        ) : captured ? (
          <img src={captured} alt="capture" className="w-full h-full object-cover" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Face guide overlay */}
        {!captured && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-72 border-4 border-white/60 rounded-full" />
          </div>
        )}
      </div>

      <div className="p-6 bg-black/50 flex justify-center gap-4">
        {captured ? (
          <>
            <button onClick={retake} className="btn-secondary px-6 py-3">Ambil Ulang</button>
            <button onClick={() => capturedBlob && onCapture(capturedBlob)} disabled={isLoading} className="btn-primary px-6 py-3">
              {isLoading ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : 'Gunakan Foto Ini'}
            </button>
          </>
        ) : (
          <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 hover:scale-95 active:scale-90 transition-transform" />
        )}
      </div>
    </div>
  );
};

