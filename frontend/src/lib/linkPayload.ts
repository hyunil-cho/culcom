/**
 * 공개 링크의 ?d= 페이로드 인코딩/디코딩.
 *
 * 표준 base64(`btoa`)는 `+`, `/`, `=` 를 포함해 SMS/메신저의 자동 링크 인식기를 거치며 깨진다
 * (특히 `+` 가 query string 에서 공백으로 디코딩되는 케이스). 그래서 base64url(RFC 4648 §5)
 * 로 인코딩해 URL-safe 하게 만든다 (`+→-`, `/→_`, `=` 패딩 제거).
 *
 * decoder 는 신규 base64url 과 과거 표준 base64 양쪽 모두를 받아들여,
 * 이미 발송된 옛 SMS 링크도 동작하도록 호환을 유지한다.
 */

export function encodeLinkPayload(obj: unknown): string {
  const json = JSON.stringify(obj);
  return btoa(encodeURIComponent(json))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function decodeLinkPayload<T>(d: string): T {
  const standard = d.replace(/-/g, '+').replace(/_/g, '/');
  const padded = standard + '='.repeat((4 - (standard.length % 4)) % 4);
  return JSON.parse(decodeURIComponent(atob(padded))) as T;
}
