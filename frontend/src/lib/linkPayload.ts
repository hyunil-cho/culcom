/**
 * 공개 링크의 ?d= 페이로드 인코딩/디코딩.
 *
 * 표준 base64(`btoa`)는 `+`, `/`, `=` 를 포함해 SMS/메신저의 자동 링크 인식기를 거치며 깨진다
 * (특히 `+` 가 query string 에서 공백으로 디코딩되는 케이스). 그래서 base64url(RFC 4648 §5)
 * 로 인코딩해 URL-safe 하게 만든다 (`+→-`, `/→_`, `=` 패딩 제거).
 *
 * 인코딩은 JSON → UTF-8 바이트 → base64url 의 **직접 변환**. 과거에는
 * `btoa(encodeURIComponent(json))` 으로 감쌌는데, 퍼센트 인코딩이 한글 1자를 9자로
 * 부풀려 페이로드가 2배 이상 커지고, LMS 의 200자 내외 자동 링크 파서에 걸려
 * 문자 상에서 클릭이 안 되는 문제가 있었다. 바이트 직접 인코딩으로 URL 길이를 절반 이하로 줄인다.
 *
 * decoder 는 신규(UTF-8 직접)·레거시(encodeURIComponent) 양쪽을 모두 받아들여
 * 이미 발송된 옛 링크도 동작하도록 호환을 유지한다. base64url 뿐 아니라 과거 표준 base64
 * 도 `-/_` 역치환과 패딩 보정으로 복호화된다.
 */

export function encodeLinkPayload(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function decodeLinkPayload<T>(d: string): T {
  const standard = d.replace(/-/g, '+').replace(/_/g, '/');
  const padded = standard + '='.repeat((4 - (standard.length % 4)) % 4);
  const binary = atob(padded);

  // 레거시 포맷: encodeURIComponent 로 감싼 뒤 base64. 결과는 반드시 '%' 로 시작(예: '%7B' = '{').
  // 유효한 JSON 문자열은 '%' 로 시작하지 않으므로 이 판별은 충돌 없음.
  if (binary.startsWith('%')) {
    return JSON.parse(decodeURIComponent(binary)) as T;
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}
