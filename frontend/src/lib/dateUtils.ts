/**
 * 공통 날짜/시간 포맷 유틸리티
 * 서버와 동일한 포맷 사용: "yyyy-MM-dd HH:mm"
 */

/** datetime-local input 값을 서버 전송용 포맷으로 변환 ("2026-04-15T23:12" → "2026-04-15 23:12") */
export function toServerDateTime(input: string): string {
  return input.replace('T', ' ');
}

/** 서버에서 받은 ISO 날짜 문자열을 표시용 포맷으로 변환 ("2026-04-15T23:12:00" → "2026-04-15 23:12") */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  return value.replace('T', ' ').slice(0, 16);
}
