/**
 * 전화번호 검증 유틸 로직. 전화번호는 '-' 없이 숫자로만 구성되어야 한다.
 */
export function verifyPhoneNumber(phone: string): boolean {
    return !/^010[0-9]{8}$/.test(phone);
}
/**
 * 전화번호에서 하이픈 삭제 유틸
 */
export function cleanPhoneNumber(phone: string): string {
    return phone.replace(/[^0-9]/g, '').slice(0, 11);
}

/**
 * 메시지 템플릿의 플레이스홀더를 실제 값으로 치환한다.
 * placeholders: API에서 받아온 플레이스홀더 목록
 * values: { [placeholder.value]: 실제값 } 형태의 맵 (예: { "{customer.name}": "홍길동" })
 * 값이 없는 플레이스홀더는 빈 문자열로 치환된다.
 */
export function resolvePlaceholders(
  content: string,
  placeholders: { name: string; value: string | null }[],
  values: Record<string, string>,
): string {
  let result = content;
  for (const ph of placeholders) {
    if (!ph.name || !ph.value) continue;
    result = result.replaceAll(ph.name, values[ph.value] ?? '');
  }
  return result;
}

export function maskName(name: string | null):string {
    if (!name) return '-';
    if (name.length <= 1) return '*';
    if (name.length === 2) return name[0] + '*';
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}