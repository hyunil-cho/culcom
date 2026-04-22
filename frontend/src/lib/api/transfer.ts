import { api } from './client';
import type { PageResponse } from './client';
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
  toCustomerPhone: string | null;
  adminMessage: string | null;
  /** 참조 완료 여부 — true면 기본 리스트에서 숨김 */
  referenced: boolean;
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

export interface TransferListParams {
  /** 양수자(toCustomer) 이름 부분 매칭 — 서버는 양수자 기준으로만 필터 */
  name?: string;
  /** 양수자(toCustomer) 전화 부분 매칭 */
  phone?: string;
  /** 생성/접수 상태만 (status가 지정되면 무시됨) */
  activeOnly?: boolean;
  /** 특정 상태만 (지정 시 activeOnly보다 우선) */
  status?: TransferStatus;
  /** 참조 완료된(=활용된) 요청까지 포함할지 여부. 기본 false → 참조 완료 건은 숨김 */
  includeReferenced?: boolean;
  /** 0-index 페이지 번호 */
  page?: number;
  /** 페이지 크기 (기본 20) */
  size?: number;
}

export const transferApi = {
  list: (params?: TransferListParams) => {
    const sp = new URLSearchParams();
    if (params?.name) sp.set('name', params.name);
    if (params?.phone) sp.set('phone', params.phone);
    if (params?.activeOnly) sp.set('activeOnly', 'true');
    if (params?.status) sp.set('status', params.status);
    if (params?.includeReferenced) sp.set('includeReferenced', 'true');
    if (params?.page != null) sp.set('page', String(params.page));
    if (params?.size != null) sp.set('size', String(params.size));
    const qs = sp.toString();
    return api.get<PageResponse<TransferRequestItem>>(`/transfer-requests${qs ? `?${qs}` : ''}`);
  },
  /** 이름+전화번호로 접수 대기 양도 요청 조회 */
  findPending: (name: string, phone: string) =>
    api.get<TransferRequestItem | null>(`/transfer-requests/pending?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`),
  create: (memberMembershipSeq: number, transferFee?: number) =>
    api.post<TransferRequestItem>('/transfer-requests', { memberMembershipSeq, transferFee }),
  updateStatus: (seq: number, status: TransferStatus, adminMessage?: string) =>
    api.put<TransferRequestItem>(
      `/transfer-requests/${seq}/status?status=${status}${adminMessage ? `&adminMessage=${encodeURIComponent(adminMessage)}` : ''}`
    ),
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
