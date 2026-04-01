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