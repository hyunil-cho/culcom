import { api } from './client';
import type { ConsentItem } from './consent';

// ── 타입 ──

export type TransferStatus = '생성' | '접수' | '확인' | '거절';

export interface TransferRequestItem {
  seq: number;
  memberMembershipSeq: number;
  membershipSeq: number;
  membershipName: string;
  expiryDate: string | null;
  fromMemberSeq: number;
  fromMemberName: string;
  fromMemberPhone: string;
  status: TransferStatus;
  transferFee: number;
  remainingCount: number;
  token: string;
  inviteToken: string | null;
  toCustomerSeq: number | null;
  toCustomerName: string | null;
  createdDate: string;
}

export interface TransferPublicInfo {
  membershipName: string;
  fromMemberName: string;
  remainingCount: number;
  expiryDate: string;
  transferFee: number;
  status: string;
  inviteToken: string | null;
}

export interface TransferInviteInfo {
  membershipName: string;
  fromMemberName: string;
  remainingCount: number;
  expiryDate: string;
  transferFee: number;
  consentItems: ConsentItem[];
}

export interface TransferInviteSubmitData {
  name: string;
  phoneNumber: string;
  availableTime?: string;
  consents: { consentItemSeq: number; agreed: boolean }[];
}

// ── 관리자 API ──

export const transferApi = {
  list: () => api.get<TransferRequestItem[]>('/transfer-requests'),
  /** 이름+전화번호로 접수 대기 양도 요청 조회 */
  findPending: (name: string, phone: string) =>
    api.get<TransferRequestItem | null>(`/transfer-requests/pending?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`),
  create: (memberMembershipSeq: number) =>
    api.post<TransferRequestItem>('/transfer-requests', { memberMembershipSeq }),
  updateStatus: (seq: number, status: TransferStatus) =>
    api.put<TransferRequestItem>(`/transfer-requests/${seq}/status?status=${status}`),
  complete: (seq: number, memberSeq: number) =>
    api.post<TransferRequestItem>(`/transfer-requests/${seq}/complete?memberSeq=${memberSeq}`),
};

// ── 공개 API ──

export const publicTransferApi = {
  /** 양도자 페이지: 정보 조회 */
  getByToken: (token: string) =>
    api.get<TransferPublicInfo>(`/public/transfer?token=${token}`),
  /** 양도자: 진행 확인 → 초대 토큰 생성 */
  confirm: (token: string) =>
    api.post<TransferPublicInfo>(`/public/transfer/confirm?token=${token}`),
  /** 양수자: 초대 정보 조회 */
  getInviteInfo: (token: string) =>
    api.get<TransferInviteInfo>(`/public/transfer/invite?token=${token}`),
  /** 양수자: 정보 제출 */
  submitInvite: (token: string, data: TransferInviteSubmitData) =>
    api.post<void>(`/public/transfer/invite/submit?token=${token}`, data),
};
