import { api, type PageResponse } from './client';
import { API } from '@/lib/routes';

export interface ComplexMember {
  seq: number;
  name: string;
  phoneNumber: string;
  level?: string;
  language?: string;
  info?: string;
  signupChannel?: string;
  interviewer?: string;
  staffStatus?: string;
  comment?: string;
  joinDate?: string;
  createdDate?: string;
  lastUpdateDate?: string;
  attendanceHistory?: string[];
  smsWarning?: string;
  firstPaymentAmount?: number | null;
  firstPaymentDate?: string | null;
}

export interface ComplexMemberMetaData {
  level?: string;
  language?: string;
  signupChannel?: string;
  interviewer?: string;
}

/**
 * 멤버십 본질 상태.
 * - 활성: 정상 사용 가능
 * - 정지: 일시적 사용 불가 (스태프 휴직 등). 가역적
 * - 만료: 횟수 소진/기간 만료로 자동 전이됨. 새 멤버십 등록 유도
 * - 환불: 환불 처리됨. 비가역
 */
export type MembershipStatus = '활성' | '정지' | '만료' | '환불';

export interface CardPaymentDetail {
  cardCompany: string;
  cardNumber: string;
  cardApprovalDate: string;
  cardApprovalNumber: string;
}

export interface MemberMembershipRequest {
  membershipSeq: number;
  startDate?: string;
  expiryDate?: string;
  price?: string;
  depositAmount?: string;
  paymentMethod?: string;
  paymentDate?: string;
  status?: MembershipStatus;
  cardDetail?: CardPaymentDetail;
}

export type PaymentKind = 'DEPOSIT' | 'BALANCE' | 'ADDITIONAL' | 'REFUND';
export type PaymentMethod = string;

export interface MembershipPaymentResponse {
  seq: number;
  memberMembershipSeq: number;
  amount: number;
  paidDate: string;
  method: PaymentMethod | null;
  kind: PaymentKind;
  note: string | null;
  createdDate: string;
  cardDetail?: CardPaymentDetail | null;
}

export interface MembershipPaymentRequest {
  amount: number;
  kind: PaymentKind;
  method?: PaymentMethod;
  paidDate?: string;
  note?: string;
  cardDetail?: CardPaymentDetail;
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
  paymentMethod: PaymentMethod | null;
  paymentDate: string | null;
  status: MembershipStatus;
  transferable: boolean;
  transferred: boolean;
  createdDate: string;
  paidAmount: number;
  outstanding: number | null;
  paymentStatus: '미정' | '미납' | '부분납부' | '완납' | '초과';
  payments?: MembershipPaymentResponse[] | null;
}

export interface OutstandingItem {
  memberSeq: number;
  memberName: string;
  phoneNumber: string;
  memberMembershipSeq: number;
  membershipName: string;
  price: number | null;
  paidAmount: number;
  outstanding: number;
  lastPaidDate: string | null;
  daysSinceLastPaid: number | null;
  paymentStatus: string;
}

export interface MemberActivityTimelineItem {
  type: 'MEMBERSHIP' | 'POSTPONEMENT' | 'POSTPONEMENT_RESULT' | 'REFUND' | 'REFUND_RESULT' | 'ATTENDANCE' | 'STAFF_REGISTER' | 'STATUS_CHANGE' | 'CLASS_ASSIGN' | 'INFO_CHANGE' | 'REFUND_CHANGE';
  date: string;
  title: string;
  detail: string | null;
  status: string;
}

// 공개 API에서 사용하는 회원 정보 (환불/연기/멤버십 조회 공통)
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
  listPayments: (seq: number, mmSeq: number) =>
    api.get<MembershipPaymentResponse[]>(`${API.COMPLEX_MEMBER_MEMBERSHIP(seq, mmSeq)}/payments`),
  addPayment: (seq: number, mmSeq: number, data: MembershipPaymentRequest) =>
    api.post<MembershipPaymentResponse>(`${API.COMPLEX_MEMBER_MEMBERSHIP(seq, mmSeq)}/payments`, data),
};

export const outstandingApi = {
  list: (params?: { keyword?: string; sort?: string; page?: number; size?: number }) => {
    const sp = new URLSearchParams();
    if (params?.keyword) sp.set('keyword', params.keyword);
    if (params?.sort) sp.set('sort', params.sort);
    sp.set('page', String(params?.page ?? 0));
    sp.set('size', String(params?.size ?? 20));
    return api.get<PageResponse<OutstandingItem>>(`/complex/outstanding?${sp.toString()}`);
  },
};
