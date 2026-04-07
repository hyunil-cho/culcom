import { api, type PageResponse } from './client';
import { API } from '@/lib/routes';

// ── 수업 ──

export interface ComplexClass {
  seq: number;
  name: string;
  description?: string;
  capacity: number;
  sortOrder: number;
  timeSlotSeq?: number;
  timeSlotName?: string;
  staffSeq?: number;
  staffName?: string;
  createdDate?: string;
}

export interface ComplexClassRequest {
  name: string;
  description?: string;
  capacity?: number;
  sortOrder?: number;
  timeSlotSeq?: number;
  staffSeq?: number;
}

export const classApi = {
  list: (params?: string) => api.get<PageResponse<ComplexClass>>(`${API.COMPLEX_CLASSES}${params ? `?${params}` : ''}`),
  get: (seq: number) => api.get<ComplexClass>(API.COMPLEX_CLASS(seq)),
  create: (data: ComplexClassRequest) => api.post<ComplexClass>(API.COMPLEX_CLASSES, data),
  update: (seq: number, data: ComplexClassRequest) => api.put<ComplexClass>(API.COMPLEX_CLASS(seq), data),
  delete: (seq: number) => api.delete<void>(API.COMPLEX_CLASS(seq)),
};

// ── 회원 ──

export interface ComplexMember {
  seq: number;
  name: string;
  phoneNumber: string;
  level?: string;
  language?: string;
  info?: string;
  chartNumber?: string;
  signupChannel?: string;
  interviewer?: string;
  staffStatus?: string;
  comment?: string;
  joinDate?: string;
  createdDate?: string;
  lastUpdateDate?: string;
  attendanceHistory?: string[];
}

export interface ComplexMemberMetaData {
  level?: string;
  language?: string;
  signupChannel?: string;
}

export interface MemberMembershipRequest {
  membershipSeq: number;
  startDate?: string;
  expiryDate?: string;
  price?: string;
  depositAmount?: string;
  paymentMethod?: string;
  paymentDate?: string;
  isActive?: boolean;
}

export interface MemberMembershipResponse {
  seq: number;
  memberSeq: number;
  membershipSeq: number;
  membershipName: string;
  startDate: string;
  expiryDate: string;
  totalCount: number;
  usedCount: number;
  postponeTotal: number;
  postponeUsed: number;
  price: string | null;
  depositAmount: string | null;
  paymentMethod: string | null;
  paymentDate: string | null;
  isActive: boolean;
  createdDate: string;
}

export interface MemberActivityTimelineItem {
  type: 'MEMBERSHIP' | 'POSTPONEMENT' | 'POSTPONEMENT_RESULT' | 'REFUND' | 'REFUND_RESULT' | 'ATTENDANCE' | 'STAFF_REGISTER' | 'STATUS_CHANGE' | 'CLASS_ASSIGN' | 'INFO_CHANGE' | 'REFUND_CHANGE';
  date: string;
  title: string;
  detail: string | null;
  status: string;
}

export const memberApi = {
  list: (params?: string) => api.get<PageResponse<ComplexMember>>(`${API.COMPLEX_MEMBERS}${params ? `?${params}` : ''}`),
  get: (seq: number) => api.get<ComplexMember>(API.COMPLEX_MEMBER(seq)),
  create: (data: Partial<ComplexMember>) => api.post<ComplexMember>(API.COMPLEX_MEMBERS, data),
  update: (seq: number, data: Partial<ComplexMember>) => api.put<ComplexMember>(API.COMPLEX_MEMBER(seq), data),
  updateMetaData: (seq: number, data: ComplexMemberMetaData) =>
    api.put<ComplexMember>(`${API.COMPLEX_MEMBER(seq)}/metadata`, data),
  delete: (seq: number) => api.delete<void>(API.COMPLEX_MEMBER(seq)),
  getMemberships: (seq: number) => api.get<MemberMembershipResponse[]>(API.COMPLEX_MEMBER_MEMBERSHIPS(seq)),
  timeline: (seq: number, page: number, size: number) =>
    api.get<PageResponse<MemberActivityTimelineItem>>(`${API.COMPLEX_MEMBER_TIMELINE(seq)}?page=${page}&size=${size}`),
  assignMembership: (seq: number, data: MemberMembershipRequest) =>
    api.post<MemberMembershipResponse>(API.COMPLEX_MEMBER_MEMBERSHIPS(seq), data),
  updateMembership: (seq: number, mmSeq: number, data: MemberMembershipRequest) =>
    api.put<MemberMembershipResponse>(API.COMPLEX_MEMBER_MEMBERSHIP(seq, mmSeq), data),
  deleteMembership: (seq: number, mmSeq: number) =>
    api.delete<void>(API.COMPLEX_MEMBER_MEMBERSHIP(seq, mmSeq)),
  assignClass: (seq: number, classSeq: number) =>
    api.post<void>(`${API.COMPLEX_MEMBER(seq)}/class/${classSeq}`),
  getClassMappings: (seq: number) =>
    api.get<{ classSeq: number; timeSlotSeq: number | null }[]>(`${API.COMPLEX_MEMBER(seq)}/class`),
  reassignClass: (seq: number, classSeq: number) =>
    api.put<void>(`${API.COMPLEX_MEMBER(seq)}/class/${classSeq}`),
};

// ── 스태프 ──

export interface ComplexStaff {
  seq: number;
  name: string;
  phoneNumber?: string;
  branchName?: string;
  status: string;
  joinDate?: string;
  interviewer?: string;
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

// ── 멤버십 ──

export interface Membership {
  seq: number;
  name: string;
  duration: number;
  count: number;
  price: number;
  createdDate: string | null;
  lastUpdateDate: string | null;
}

export interface MembershipRequest {
  name: string;
  duration: number;
  count: number;
  price: number;
}

export const membershipApi = {
  list: () => api.get<Membership[]>(API.MEMBERSHIPS),
  get: (seq: number) => api.get<Membership>(API.MEMBERSHIP(seq)),
  create: (data: MembershipRequest) => api.post<Membership>(API.MEMBERSHIPS, data),
  update: (seq: number, data: MembershipRequest) => api.put<Membership>(API.MEMBERSHIP(seq), data),
  delete: (seq: number) => api.delete<void>(API.MEMBERSHIP(seq)),
};

// ── 시간대 ──

export interface ClassTimeSlot {
  seq: number;
  name: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
  createdDate: string | null;
}

export interface ClassTimeSlotRequest {
  name: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
}

export const timeslotApi = {
  list: () => api.get<ClassTimeSlot[]>(API.COMPLEX_TIMESLOTS),
  create: (data: ClassTimeSlotRequest) => api.post<ClassTimeSlot>(API.COMPLEX_TIMESLOTS, data),
  update: (seq: number, data: ClassTimeSlotRequest) => api.put<ClassTimeSlot>(API.COMPLEX_TIMESLOT(seq), data),
  delete: (seq: number) => api.delete<void>(API.COMPLEX_TIMESLOT(seq)),
};

// ── 환불 ──

export interface RefundRequest {
  seq: number;
  memberName: string;
  phoneNumber: string;
  membershipName: string;
  price: string | null;
  reason: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  status: '대기' | '승인' | '반려';
  rejectReason: string | null;
  createdDate: string;
  // 멤버십 사용 내역
  startDate: string | null;
  expiryDate: string | null;
  totalCount: number | null;
  usedCount: number | null;
  postponeUsed: number | null;
}

export interface RefundReason {
  seq: number;
  reason: string;
  createdDate: string;
}

export const refundApi = {
  list: (params?: string) =>
    api.get<PageResponse<RefundRequest>>(`${API.COMPLEX_REFUNDS}${params ? `?${params}` : ''}`),
  updateStatus: (seq: number, status: string, rejectReason?: string) =>
    api.put<RefundRequest>(
      `${API.COMPLEX_REFUND_STATUS(seq)}?status=${encodeURIComponent(status)}${rejectReason ? `&rejectReason=${encodeURIComponent(rejectReason)}` : ''}`
    ),
  reasons: () => api.get<RefundReason[]>(API.COMPLEX_REFUND_REASONS),
  addReason: (reason: string) => api.post<RefundReason>(API.COMPLEX_REFUND_REASONS, { reason }),
  deleteReason: (seq: number) => api.delete<void>(API.COMPLEX_REFUND_REASON(seq)),
};

// ── 연기 ──

export interface PostponementRequest {
  seq: number;
  memberName: string;
  phoneNumber: string;
  timeSlot: string;
  currentClass: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: '대기' | '승인' | '반려';
  rejectReason: string | null;
  createdDate: string;
}

export interface PostponementReason {
  seq: number;
  reason: string;
  createdDate: string;
}

export const postponementApi = {
  list: (params?: string) =>
    api.get<PageResponse<PostponementRequest>>(`${API.COMPLEX_POSTPONEMENTS}${params ? `?${params}` : ''}`),
  updateStatus: (seq: number, status: string, rejectReason?: string) =>
    api.put<PostponementRequest>(
      `${API.COMPLEX_POSTPONEMENT_STATUS(seq)}?status=${encodeURIComponent(status)}${rejectReason ? `&rejectReason=${encodeURIComponent(rejectReason)}` : ''}`
    ),
  reasons: () => api.get<PostponementReason[]>(API.COMPLEX_POSTPONEMENT_REASONS),
  addReason: (reason: string) => api.post<PostponementReason>(API.COMPLEX_POSTPONEMENT_REASONS, { reason }),
  deleteReason: (seq: number) => api.delete<void>(API.COMPLEX_POSTPONEMENT_REASON(seq)),
  memberHistory: (memberSeq: number) => api.get<PostponementRequest[]>(API.COMPLEX_POSTPONEMENT_MEMBER_HISTORY(memberSeq)),
};

// ── 공개 연기 요청 ──

export interface PublicMemberInfo {
  seq: number; name: string; phoneNumber: string;
  branchSeq: number; branchName: string; level: string | null;
  memberships: PublicMembershipInfo[]; classes: PublicClassInfo[];
}

export interface PublicMembershipInfo {
  seq: number; membershipName: string; startDate: string; expiryDate: string;
  totalCount: number; usedCount: number; postponeTotal: number; postponeUsed: number;
}

export interface PublicClassInfo {
  name: string; timeSlotName: string; startTime: string; endTime: string;
}

export interface PostponementSubmitRequest {
  name: string; phone: string; branchSeq: number; memberSeq: number;
  memberMembershipSeq: number; timeSlot: string; currentClass: string;
  startDate: string; endDate: string; reason: string;
}

export interface PostponementSubmitResponse {
  name: string; phone: string; branchName: string; timeSlot: string;
  currentClass: string; startDate: string; endDate: string; reason: string;
}

export const publicPostponementApi = {
  searchMember: (name: string, phone: string) =>
    api.get<{ members: PublicMemberInfo[] }>(
      `${API.PUBLIC_POSTPONEMENT_SEARCH}?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`
    ),
  submit: (data: PostponementSubmitRequest) =>
    api.post<PostponementSubmitResponse>(API.PUBLIC_POSTPONEMENT_SUBMIT, data),
  reasons: (branchSeq: number) =>
    api.get<string[]>(`${API.PUBLIC_POSTPONEMENT_REASONS}?branchSeq=${branchSeq}`),
};

// ── 공개 환불 요청 ──

export interface RefundSubmitRequest {
  branchSeq: number; memberSeq: number; memberMembershipSeq: number;
  memberName: string; phoneNumber: string; membershipName: string;
  price: string; reason: string; bankName: string; accountNumber: string; accountHolder: string;
}

export const publicRefundApi = {
  searchMember: (name: string, phone: string) =>
    api.get<{ members: PublicMemberInfo[] }>(
      `${API.PUBLIC_REFUND_SEARCH}?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`
    ),
  submit: (data: RefundSubmitRequest) => api.post<void>(API.PUBLIC_REFUND_SUBMIT, data),
  reasons: (branchSeq: number) =>
    api.get<string[]>(`${API.PUBLIC_REFUND_REASONS}?branchSeq=${branchSeq}`),
};

// ── 공개 멤버십 조회 ──

export interface MembershipCheckMember {
  name: string; phoneNumber: string; branchName: string; level: string | null;
  memberships: MembershipCheckDetail[];
}

export interface MembershipCheckDetail {
  membershipName: string; status: string; startDate: string; expiryDate: string;
  totalCount: number; usedCount: number; postponeTotal: number; postponeUsed: number;
  presentCount: number; absentCount: number; totalAttendance: number; attendanceRate: number;
}

export const publicMembershipApi = {
  check: (name: string, phone: string) =>
    api.get<{ member: MembershipCheckMember | null }>(
      `${API.PUBLIC_MEMBERSHIP_CHECK}?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`
    ),
};
