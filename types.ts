
export type SlotType = 'SAT_DAWN' | 'SAT_ASR' | 'WED_MAGHRIB' | 'PRAYER_FAJR' | 'PRAYER_MAGHRIB' | 'PRAYER_ISHA';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Student {
  id: string;
  name: string;
  group: string;
  joinedDate: string;
  notes?: string;
}

export interface AttendanceRecord {
  studentId: string;
  date: string; // ISO format YYYY-MM-DD
  slot: SlotType;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  comment?: string;
}

export const SLOT_LABELS: Record<SlotType, string> = {
  SAT_DAWN: 'صباح السبت (فجر)',
  SAT_ASR: 'عصر السبت',
  WED_MAGHRIB: 'مساء الأربعاء (مغرب)',
  PRAYER_FAJR: 'صلاة الفجر',
  PRAYER_MAGHRIB: 'صلاة المغرب',
  PRAYER_ISHA: 'صلاة العشاء',
};

export const SESSION_SLOTS: SlotType[] = ['SAT_DAWN', 'SAT_ASR', 'WED_MAGHRIB'];
export const PRAYER_SLOTS: SlotType[] = ['PRAYER_FAJR', 'PRAYER_MAGHRIB', 'PRAYER_ISHA'];

export const GROUPS = ['مجموعة الثانوي', 'مجموعة المتوسط', 'طالب جديد'];

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: '#10b981', // Emerald
  absent: '#ef4444',  // Red
  late: '#f59e0b',    // Amber
  excused: '#3b82f6', // Blue
};

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'حاضر',
  absent: 'غائب',
  late: 'متأخر',
  excused: 'مستأذن',
};
