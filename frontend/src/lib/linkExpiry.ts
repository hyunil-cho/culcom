/**
 * 공개용 링크(멤버십 조회/환불/연기 등)의 유효 기간은 생성 시점으로부터 7일이다.
 * Base64 JSON 페이로드의 `t` 필드(ms 단위 타임스탬프)로 발급 시각을 전달한다.
 */
export const LINK_VALID_MS = 7 * 24 * 60 * 60 * 1000;

export const INVALID_LINK_MESSAGE = '유효하지 않은 링크입니다. 관리자에게 문의해주세요.';

export function isLinkExpired(t: unknown): boolean {
  if (typeof t !== 'number' || !Number.isFinite(t)) return false;
  return Date.now() - t > LINK_VALID_MS;
}
