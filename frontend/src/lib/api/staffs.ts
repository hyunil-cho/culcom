import { api, type PageResponse } from './client';
import { API } from '@/lib/routes';
import type { MemberActivityTimelineItem } from './members';

export interface ComplexStaff {
  seq: number;
  name: string;
  phoneNumber?: string;
  branchName?: string;
  status: string;
  joinDate?: string;
}

export interface StaffRefundInfo {
  seq: number;
  staffSeq: number;
  depositAmount?: string;
  refundableDeposit?: string;
  nonRefundableDeposit?: string;
  refundBank?: string;
  refundAccount?: string;
  refundAmount?: string;
  paymentMethod?: string;
}

export const staffApi = {
  list: () => api.get<ComplexStaff[]>(API.COMPLEX_STAFFS),
  get: (seq: number) => api.get<ComplexStaff>(API.COMPLEX_STAFF(seq)),
  create: (data: Partial<ComplexStaff>) => api.post<ComplexStaff>(API.COMPLEX_STAFFS, data),
  update: (seq: number, data: Partial<ComplexStaff>) => api.put<ComplexStaff>(API.COMPLEX_STAFF(seq), data),
  delete: (seq: number) => api.delete<void>(API.COMPLEX_STAFF(seq)),
  getRefund: (staffSeq: number) => api.get<StaffRefundInfo | null>(API.COMPLEX_STAFF_REFUND(staffSeq)),
  saveRefund: (staffSeq: number, data: Partial<StaffRefundInfo>) =>
    api.post<StaffRefundInfo>(API.COMPLEX_STAFF_REFUND(staffSeq), data),
  deleteRefund: (staffSeq: number) => api.delete<void>(API.COMPLEX_STAFF_REFUND(staffSeq)),
  timeline: (staffSeq: number, page: number, size: number) =>
    api.get<PageResponse<MemberActivityTimelineItem>>(`${API.COMPLEX_STAFF_TIMELINE(staffSeq)}?page=${page}&size=${size}`),
};
