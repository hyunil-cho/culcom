import { api, type PageResponse } from './client';
import { API } from '@/lib/routes';
import type { PublicMemberInfo } from './members';

export interface PostponementRequest {
  seq: number;
  memberName: string;
  phoneNumber: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: '대기' | '승인' | '반려';
  adminMessage: string | null;
  createdDate: string;
  desiredClassName: string | null;
  desiredTimeSlotName: string | null;
  desiredStartTime: string | null;
  desiredEndTime: string | null;
}

export interface PostponementReason {
  seq: number;
  reason: string;
  createdDate: string;
}

export const postponementApi = {
  list: (params?: string) =>
    api.get<PageResponse<PostponementRequest>>(`${API.COMPLEX_POSTPONEMENTS}${params ? `?${params}` : ''}`),
  updateStatus: (seq: number, status: string, adminMessage?: string) =>
    api.put<PostponementRequest>(
      `${API.COMPLEX_POSTPONEMENT_STATUS(seq)}?status=${encodeURIComponent(status)}${adminMessage ? `&adminMessage=${encodeURIComponent(adminMessage)}` : ''}`
    ),
  reasons: () => api.get<PostponementReason[]>(API.COMPLEX_POSTPONEMENT_REASONS),
  addReason: (reason: string) => api.post<PostponementReason>(API.COMPLEX_POSTPONEMENT_REASONS, { reason }),
  deleteReason: (seq: number) => api.delete<void>(API.COMPLEX_POSTPONEMENT_REASON(seq)),
  memberHistory: (memberSeq: number) => api.get<PostponementRequest[]>(API.COMPLEX_POSTPONEMENT_MEMBER_HISTORY(memberSeq)),
};

// ── 공개 연기 요청 ──

export interface PostponementSubmitRequest {
  name: string; phone: string; branchSeq: number; memberSeq: number;
  memberMembershipSeq: number;
  startDate: string; endDate: string; reason: string;
  desiredClassSeq?: number | null;
}

export interface PostponementSubmitResponse {
  name: string; phone: string; branchName: string;
  startDate: string; endDate: string; reason: string;
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
