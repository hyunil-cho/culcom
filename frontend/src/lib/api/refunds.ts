import { api, type PageResponse } from './client';
import { API } from '@/lib/routes';
import type { PublicMemberInfo } from './members';

export interface RefundRequest {
  seq: number;
  memberName: string;
  phoneNumber: string;
  membershipName: string;
  price: string | null;
  reason: string;
  status: '대기' | '승인' | '반려';
  adminMessage: string | null;
  createdDate: string;
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
  updateStatus: (seq: number, status: string, adminMessage?: string) =>
    api.put<RefundRequest>(
      `${API.COMPLEX_REFUND_STATUS(seq)}?status=${encodeURIComponent(status)}${adminMessage ? `&adminMessage=${encodeURIComponent(adminMessage)}` : ''}`
    ),
  reasons: () => api.get<RefundReason[]>(API.COMPLEX_REFUND_REASONS),
  addReason: (reason: string) => api.post<RefundReason>(API.COMPLEX_REFUND_REASONS, { reason }),
  deleteReason: (seq: number) => api.delete<void>(API.COMPLEX_REFUND_REASON(seq)),
};

// ── 공개 환불 요청 ──

export interface RefundSubmitRequest {
  branchSeq: number; memberSeq: number; memberMembershipSeq: number;
  memberName: string; phoneNumber: string; membershipName: string;
  price: string; reason: string;
}

export interface RefundSurveyResponse {
  seq: number;
  refundRequestSeq: number | null;
  memberName: string;
  phoneNumber: string;
  participationPeriod: string;
  belongingScore: number;
  teamImpact: string;
  differenceComment: string | null;
  improvementComment: string | null;
  reEnrollScore: number;
  createdDate: string;
}

export const refundSurveyApi = {
  list: (params?: string) =>
    api.get<PageResponse<RefundSurveyResponse>>(
      `/complex/refund-surveys${params ? `?${params}` : ''}`,
    ),
  detail: (seq: number) => api.get<RefundSurveyResponse>(`/complex/refund-surveys/${seq}`),
  byRefund: (refundRequestSeq: number) =>
    api.get<RefundSurveyResponse | null>(`/complex/refund-surveys/by-refund/${refundRequestSeq}`),
};

export const publicRefundApi = {
  searchMember: (name: string, phone: string) =>
    api.get<{ members: PublicMemberInfo[] }>(
      `${API.PUBLIC_REFUND_SEARCH}?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`
    ),
  submit: (data: RefundSubmitRequest) => api.post<number>(API.PUBLIC_REFUND_SUBMIT, data),
  reasons: (branchSeq: number) =>
    api.get<string[]>(`${API.PUBLIC_REFUND_REASONS}?branchSeq=${branchSeq}`),
};

export interface RefundSurveySubmitRequest {
  branchSeq: number;
  refundRequestSeq?: number;
  memberName: string;
  phoneNumber: string;
  participationPeriod: string;
  belongingScore: number;
  teamImpact: string;
  differenceComment: string;
  improvementComment: string;
  reEnrollScore: number;
}

export const publicRefundSurveyApi = {
  submit: (data: RefundSurveySubmitRequest) =>
    api.post<void>(API.PUBLIC_REFUND_SURVEY_SUBMIT, data),
};
