import { api } from './client';
import { API } from '@/lib/routes';

export interface AttendanceViewMember {
  memberSeq: number; name: string; phoneNumber: string;
  level?: string; info?: string; joinDate?: string; expiryDate?: string;
  totalCount?: number; usedCount?: number; membershipName?: string;
  staff: boolean; postponed: boolean; noMembership: boolean; status: string;
  /** status 기록의 실제 날짜(YYYY-MM-DD). 오늘이 아닐 수 있음 — UI에서 시각적으로 구분. */
  attendanceDate?: string | null;
  attendanceHistory?: string[];
}

export interface AttendanceViewClass {
  classSeq: number; name: string; capacity: number; members: AttendanceViewMember[];
}

export interface AttendanceViewSlot {
  timeSlotSeq: number; slotName: string; classes: AttendanceViewClass[];
}

export type BulkAttendanceResultStatus =
  | '멤버십없음'
  | '횟수소진'
  | '이미처리됨'
  | '출석'
  | '결석'
  | '출석변경'
  | '결석변경';

export interface BulkAttendanceResult {
  memberSeq: number; name: string; status: BulkAttendanceResultStatus;
}

export interface StaffAttendanceRateSummary {
  staffSeq: number; totalCount: number; presentCount: number;
}

export const attendanceViewApi = {
  getView: () => api.get<AttendanceViewSlot[]>(API.COMPLEX_ATTENDANCE_VIEW),
  getDetail: (slotSeq: number) =>
    api.get<AttendanceViewClass[]>(`${API.COMPLEX_ATTENDANCE_VIEW_DETAIL}?slotSeq=${slotSeq}`),
  bulkAttendance: (classSeq: number, members: { memberSeq: number; staff: boolean; attended: boolean }[]) =>
    api.post<BulkAttendanceResult[]>(API.COMPLEX_ATTENDANCE_BULK, { classSeq, members }),
  reorderClasses: (classOrders: { id: number; sortOrder: number }[]) =>
    api.post<void>(API.COMPLEX_ATTENDANCE_REORDER, { classOrders }),
  reorderMembers: (classSeq: number, memberOrders: { memberSeq: number; sortOrder: number }[]) =>
    api.post<void>(`${API.COMPLEX_ATTENDANCE_REORDER}/members`, { classSeq, memberOrders }),
  staffAttendanceRates: (months?: number) =>
    api.get<StaffAttendanceRateSummary[]>(
      months ? `${API.COMPLEX_ATTENDANCE_STAFF_RATES}?months=${months}` : API.COMPLEX_ATTENDANCE_STAFF_RATES
    ),
};
