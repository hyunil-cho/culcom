/**
 * 전화번호 검증 유틸 로직. 전화번호는 '-' 없이 숫자로만 구성되어야 한다.
 */
export function verifyPhoneNumber(phone: string): boolean {
    return !/^010[0-9]{8}$/.test(phone);
}