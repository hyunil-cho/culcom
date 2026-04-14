import { describe, it, expect } from 'vitest';
import { verifyPhoneNumber, cleanPhoneNumber, maskName } from '@/lib/commonUtils';

describe('verifyPhoneNumber', () => {
  it('올바른 전화번호(01012345678)는 false 반환 (유효)', () => {
    expect(verifyPhoneNumber('01012345678')).toBe(false);
  });

  it('하이픈 포함 전화번호는 true 반환 (유효하지 않음)', () => {
    expect(verifyPhoneNumber('010-1234-5678')).toBe(true);
  });

  it('자릿수 부족(010123456)은 true 반환', () => {
    expect(verifyPhoneNumber('010123456')).toBe(true);
  });

  it('자릿수 초과(0101234567890)는 true 반환', () => {
    expect(verifyPhoneNumber('0101234567890')).toBe(true);
  });

  it('010으로 시작하지 않으면 true 반환', () => {
    expect(verifyPhoneNumber('01112345678')).toBe(true);
  });

  it('빈 문자열은 true 반환', () => {
    expect(verifyPhoneNumber('')).toBe(true);
  });

  it('문자 포함은 true 반환', () => {
    expect(verifyPhoneNumber('010abcd5678')).toBe(true);
  });
});

describe('cleanPhoneNumber', () => {
  it('하이픈을 제거한다', () => {
    expect(cleanPhoneNumber('010-1234-5678')).toBe('01012345678');
  });

  it('숫자만 있으면 그대로 반환', () => {
    expect(cleanPhoneNumber('01012345678')).toBe('01012345678');
  });

  it('11자리 초과 시 잘라낸다', () => {
    expect(cleanPhoneNumber('010123456789999')).toBe('01012345678');
  });

  it('공백, 특수문자를 제거한다', () => {
    expect(cleanPhoneNumber('010 1234 5678')).toBe('01012345678');
    expect(cleanPhoneNumber('(010)1234-5678')).toBe('01012345678');
  });

  it('빈 문자열은 빈 문자열 반환', () => {
    expect(cleanPhoneNumber('')).toBe('');
  });
});

describe('maskName', () => {
  it('null이면 "-" 반환', () => {
    expect(maskName(null)).toBe('-');
  });

  it('1글자 이름은 "*" 반환', () => {
    expect(maskName('김')).toBe('*');
  });

  it('2글자 이름은 첫 글자 + "*"', () => {
    expect(maskName('김철')).toBe('김*');
  });

  it('3글자 이름은 첫 + "*" + 끝', () => {
    expect(maskName('홍길동')).toBe('홍*동');
  });

  it('4글자 이름은 첫 + "**" + 끝', () => {
    expect(maskName('남궁민수')).toBe('남**수');
  });

  it('빈 문자열은 "-" 반환', () => {
    expect(maskName('')).toBe('-');
  });
});
