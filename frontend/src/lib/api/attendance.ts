import { api, type PageResponse } from './client';
import { API } from '@/lib/routes';

export interface AttendanceViewMember {
  memberSeq: number; name: string; phoneNumber: string;
  level?: string; info?: string; joinDate?: string; expiryDate?: string;
  totalCount?: number; usedCount?: number; membershipName?: string;
  staff: boolean; postponed: boolean; status: string; attendanceHistory?: string[];
}

export interface AttendanceViewClass {
  classSeq: number; name: string; capacity: number; members: AttendanceViewMember[];
}

export interface AttendanceViewSlot {
  timeSlotSeq: number; slotName: string; classes: AttendanceViewClass[];
}

export interface BulkAttendanceResult {
  memberSeq: number; name: string; status: string;
}

export interface AttendanceHistoryDetail {
  seq: number; attendanceDate: string; status: string; className: string; note: string | null;
}

export interface AttendanceHistorySummary {
  totalCount: number; presentCount: number; absentCount: number; postponeCount: number;
  startDate: string | null; endDate: string | null;
}

export const attendanceViewApi = {
  getView: () => api.get<AttendanceViewSlot[]>(API.COMPLEX_ATTENDANCE_VIEW),
  getDetail: (slotSeq: number) =>
    api.get<AttendanceViewClass[]>(`${API.COMPLEX_ATTENDANCE_VIEW_DETAIL}?slotSeq=${slotSeq}`),
  bulkAttendance: (classSeq: number, members: { memberSeq: number; staff: boolean; attended: boolean }[]) =>
    api.post<BulkAttendanceResult[]>(API.COMPLEX_ATTENDANCE_BULK, { classSeq, members }),
  reorderClasses: (classOrders: { id: number; sortOrder: number }[]) =>
    api.post<void>(API.COMPLEX_ATTENDANCE_REORDER, { classOrders }),
  memberHistory: (memberSeq: number, page: number = 0, size: number = 20) =>
    api.get<PageResponse<AttendanceHistoryDetail>>(`${API.COMPLEX_ATTENDANCE_MEMBER_HISTORY(memberSeq)}?page=${page}&size=${size}`),
  staffHistory: (staffSeq: number, page: number = 0, size: number = 20) =>
    api.get<PageResponse<AttendanceHistoryDetail>>(`${API.COMPLEX_ATTENDANCE_STAFF_HISTORY(staffSeq)}?page=${page}&size=${size}`),
  memberHistorySummary: (memberSeq: number) =>
    api.get<AttendanceHistorySummary>(API.COMPLEX_ATTENDANCE_MEMBER_HISTORY_SUMMARY(memberSeq)),
  staffHistorySummary: (staffSeq: number) =>
    api.get<AttendanceHistorySummary>(API.COMPLEX_ATTENDANCE_STAFF_HISTORY_SUMMARY(staffSeq)),
};
