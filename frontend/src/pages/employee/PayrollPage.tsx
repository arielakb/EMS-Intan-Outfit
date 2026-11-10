import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Download, DollarSign } from 'lucide-react';
import api from '../../lib/axios';
import { formatRupiah, formatMonth, getStatusBadge, getStatusLabel } from '../../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const EmployeePayrollPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['my-payrolls'],
    queryFn: () => api.get('/payrolls/me?pageSize=12'),
  });

  const payrolls: any[] = data?.data?.data?.items ?? [];

  const downloadPayslip = (payroll: any) => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('SLIP GAJI', 105, 20, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('Intan Outfit', 105, 30, { align: 'center' });

    doc.setFontSize(11);
    doc.text(`Karyawan: ${payroll.employee?.fullName}`, 20, 50);
    doc.text(`Periode: ${formatMonth(payroll.year, payroll.month)}`, 20, 58);
    doc.text(`Status: ${getStatusLabel(payroll.status)}`, 20, 66);

    autoTable(doc, {
      startY: 80,
      head: [['Komponen', 'Jumlah']],
      body: [
        [`Upah Shift (${payroll.shiftsWorked} shift)`, formatRupiah(payroll.shiftPay ?? 0)],
        [`Uang Sakit (${payroll.sickDays} hari)`, formatRupiah(payroll.sickPay ?? 0)],
        ['Total Bonus', formatRupiah(payroll.bonusAmount ?? 0)],
        ['Penyesuaian', formatRupiah(payroll.adjustments ?? 0)],
        ['Total Gaji Bersih', formatRupiah(payroll.netSalary ?? payroll.totalAmount ?? 0)],
      ],
      foot: [['', '']],
      styles: { fontSize: 11 },
      headStyles: { fillColor: [37, 99, 235] },
      footStyles: {},
    });

    doc.save(`slip-gaji-${payroll.employee?.fullName}-${payroll.year}-${payroll.month}.pdf`);
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Slip Gaji</h1>
        <p className="text-gray-500 text-sm">Riwayat penggajian Anda</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
      ) : payrolls.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <DollarSign size={40} className="mx-auto mb-2 opacity-30" />
          <p>Belum ada data penggajian</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payrolls.map((p: any) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{formatMonth(p.year, p.month)}</p>
                  <span className={`${getStatusBadge(p.status)} mt-1`}>{getStatusLabel(p.status)}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary text-xl">{formatRupiah(p.netSalary ?? p.totalAmount ?? 0)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-gray-400">Shift</p>
                  <p className="font-semibold text-gray-700">{p.shiftsWorked}×</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-gray-400">Upah Shift</p>
                  <p className="font-semibold text-gray-700">{formatRupiah(p.shiftPay ?? 0)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-gray-400">Bonus</p>
                  <p className="font-semibold text-green-700">{formatRupiah(p.bonusAmount ?? 0)}</p>
                </div>
              </div>

              {(p.status === 'APPROVED' || p.status === 'PAID') && (
                <button onClick={() => downloadPayslip(p)} className="btn-secondary w-full btn-sm">
                  <Download size={14} /> Download Slip Gaji PDF
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

