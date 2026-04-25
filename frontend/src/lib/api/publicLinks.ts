import { api } from './client';
import type { TransferRequestItem } from './transfer';

// ── 타입 ──

export type PublicLinkKind = '멤버십' | '연기' | '환불' | '양도';

export interface PublicLinkCreateGeneralRequest {
  memberSeq: number;
  /** 양도는 별도 endpoint(`createForTransfer`) 사용 */
  kind: '멤버십' | '연기' | '환불';
  /** kind=환불 시 필수 */
  memberMembershipSeq?: number;
  /** kind=환불 시 필수 */
  refundAmount?: number;
}

export interface PublicLinkCreateResponse {
  code: string;
}

export interface PublicLinkTransferCreateResponse {
  code: string;
  transferRequest: TransferRequestItem;
}

export interface PublicLinkResolveResponse {
  kind: PublicLinkKind;
  memberSeq: number;
  memberName: string;
  memberPhone: string;
  memberMembershipSeq?: number;
  refundAmount?: number;
  /** kind=양도 시 채워짐 — 기존 양도자 페이지가 사용하던 token */
  transferToken?: string;
  expiresAt: string;
}

// ── API ──

export const publicLinkApi = {
  /** 멤버십·연기·환불 단축 링크 발급 */
  create: (req: PublicLinkCreateGeneralRequest) =>
    api.post<PublicLinkCreateResponse>('/complex/public-links', req),

  /** 양도 단축 링크 발급 — TransferRequest 생성 + PublicLink 발급을 한 트랜잭션으로 수행 */
  createForTransfer: (memberMembershipSeq: number, transferFee?: number) =>
    api.post<PublicLinkTransferCreateResponse>('/complex/public-links/transfer', {
      memberMembershipSeq,
      transferFee,
    }),

  /** 공개 단축 링크 resolve (인증 불필요) */
  resolve: (code: string) =>
    api.get<PublicLinkResolveResponse>(`/public/links/${encodeURIComponent(code)}`),
};
