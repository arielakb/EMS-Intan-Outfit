export const TIMEZONE = 'Asia/Jakarta';

export const getServerTime = (): Date => {
  return new Date();
};

export const isWithinCheckinWindow = (
  shiftStartTime: string, // "HH:MM"
  checkInTime: Date,
  limitMinutes: number = 60,
): { isValid: boolean; isLate: boolean } => {
  const [hours, minutes] = shiftStartTime.split(':').map(Number);

  const checkInDate = new Date(checkInTime);
  const shiftStart = new Date(checkInDate);
  shiftStart.setHours(hours, minutes, 0, 0);

  const shiftStartLimit = new Date(shiftStart.getTime() + limitMinutes * 60 * 1000);

  if (checkInDate > shiftStartLimit) {
    return { isValid: false, isLate: true };
  }

  return {
    isValid: true,
    isLate: checkInDate > shiftStart,
  };
};

export const isSalesReportLate = (
  shiftEndTime: string, // "HH:MM"
  submittedAt: Date,
  deadlineHours: number = 1,
): boolean => {
  const [hours, minutes] = shiftEndTime.split(':').map(Number);

  const shiftEnd = new Date(submittedAt);
  shiftEnd.setHours(hours, minutes, 0, 0);

  const deadline = new Date(shiftEnd.getTime() + deadlineHours * 60 * 60 * 1000);
  return submittedAt > deadline;
};

export const calculateBonusMultiple = (grossSales: bigint, targetAmount: bigint): number => {
  if (targetAmount <= 0n) return 0;
  return Math.floor(Number(grossSales) / Number(targetAmount));
};
