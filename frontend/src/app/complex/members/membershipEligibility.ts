import type { MemberMembershipResponse } from '@/lib/api';

/** 미수금이 존재하는지 */
export function hasOutstanding(m: MemberMembershipResponse): boolean {
  return m.outstanding != null && m.outstanding > 0;
}

/** 환불 가능: 활성 + 미수금 없음 */
export function isRefundable(m: MemberMembershipResponse): boolean {
  return m.status === '활성' && !hasOutstanding(m);
}

/** 연기 가능: 활성 + 미수금 없음 + 연기 잔여 횟수 > 0 */
export function isPostponable(m: MemberMembershipResponse): boolean {
  const hasRemaining = m.postponeTotal - m.postponeUsed > 0;
  return m.status === '활성' && !hasOutstanding(m) && hasRemaining;
}

/** 양도 가능: 활성 + 미수금 없음 + 양도 가능 상품 + 양도로 받지 않음 */
export function isTransferable(m: MemberMembershipResponse): boolean {
  return m.status === '활성' && !hasOutstanding(m) && m.transferable && !m.transferred;
}
