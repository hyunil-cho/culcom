import { describe, it, expect } from 'vitest';
import {
  emptyMemberForm,
  emptyMembershipForm,
  emptyClassAssign,
  emptyStaffForm,
  emptyRefundForm,
  validateMemberForm,
  validateMembershipForm,
  nowDateTimeLocal,
} from '@/app/complex/members/memberFormTypes';
import type { MemberFormData, MembershipFormData } from '@/app/complex/members/memberFormTypes';

describe('emptyMemberForm', () => {
  it('모든 필드가 빈 문자열', () => {
    expect(emptyMemberForm).toEqual({
      name: '', phoneNumber: '', level: '', language: '',
      info: '', signupChannel: '', comment: '',
    });
  });
});

describe('emptyMembershipForm', () => {
  it('status 기본값은 "활성"', () => {
    expect(emptyMembershipForm.status).toBe('활성');
  });

  it('paymentDate는 현재 날짜/시간 형식 (yyyy-MM-ddTHH:mm)', () => {
    expect(emptyMembershipForm.paymentDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

describe('emptyClassAssign', () => {
  it('모든 필드가 빈 문자열', () => {
    expect(emptyClassAssign).toEqual({ timeSlotSeq: '', classSeq: '' });
  });
});

describe('emptyStaffForm', () => {
  it('isStaff는 false, status는 "재직"', () => {
    expect(emptyStaffForm.isStaff).toBe(false);
    expect(emptyStaffForm.status).toBe('재직');
  });
});

describe('emptyRefundForm', () => {
  it('모든 필드가 빈 문자열', () => {
    const keys = Object.keys(emptyRefundForm);
    expect(keys).toHaveLength(7);
    keys.forEach(k => {
      expect(emptyRefundForm[k as keyof typeof emptyRefundForm]).toBe('');
    });
  });
});

describe('nowDateTimeLocal', () => {
  it('yyyy-MM-ddTHH:mm 형식 반환', () => {
    const result = nowDateTimeLocal();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('현재 연도 포함', () => {
    const year = new Date().getFullYear().toString();
    expect(nowDateTimeLocal()).toContain(year);
  });
});

describe('validateMemberForm', () => {
  const validForm: MemberFormData = {
    name: '홍길동', phoneNumber: '01012345678',
    level: '', language: '', info: '', signupChannel: '', comment: '',
  };

  it('유효한 폼은 null 반환', () => {
    expect(validateMemberForm(validForm)).toBeNull();
  });

  it('이름이 비어있으면 에러', () => {
    expect(validateMemberForm({ ...validForm, name: '' })).toBe('이름을 입력하세요.');
  });

  it('이름이 공백만 있으면 에러', () => {
    expect(validateMemberForm({ ...validForm, name: '   ' })).toBe('이름을 입력하세요.');
  });

  it('전화번호가 비어있으면 에러', () => {
    expect(validateMemberForm({ ...validForm, phoneNumber: '' })).toBe('전화번호를 입력하세요.');
  });

  it('전화번호가 공백만 있으면 에러', () => {
    expect(validateMemberForm({ ...validForm, phoneNumber: '  ' })).toBe('전화번호를 입력하세요.');
  });

  it('이름과 전화번호 모두 없으면 이름 에러 우선', () => {
    expect(validateMemberForm({ ...validForm, name: '', phoneNumber: '' })).toBe('이름을 입력하세요.');
  });
});

describe('validateMembershipForm', () => {
  const validForm: MembershipFormData = {
    membershipSeq: '1', startDate: '2026-01-01', expiryDate: '2026-12-31',
    price: '100000', paymentDate: '2026-01-01T10:00', depositAmount: '50000',
    paymentMethod: '카드', status: '활성',
  };

  it('유효한 폼은 null 반환', () => {
    expect(validateMembershipForm(validForm, false)).toBeNull();
  });

  it('멤버십 등급 미선택', () => {
    expect(validateMembershipForm({ ...validForm, membershipSeq: '' }, false)).toBe('멤버십 등급을 선택하세요.');
  });

  it('상태 미선택', () => {
    expect(validateMembershipForm({ ...validForm, status: '' as any }, false)).toBe('멤버십 상태를 선택하세요.');
  });

  it('금액 미입력', () => {
    expect(validateMembershipForm({ ...validForm, price: '' }, false)).toBe('멤버십 금액을 입력하세요.');
  });

  it('금액 공백만 있으면 에러', () => {
    expect(validateMembershipForm({ ...validForm, price: '  ' }, false)).toBe('멤버십 금액을 입력하세요.');
  });

  it('납부일 미입력', () => {
    expect(validateMembershipForm({ ...validForm, paymentDate: '' }, false)).toBe('납부일을 입력하세요.');
  });

  it('결제방법 미선택', () => {
    expect(validateMembershipForm({ ...validForm, paymentMethod: '' }, false)).toBe('결제방법을 선택하세요.');
  });

  it('신규 등록 시 첫 납부 금액 필수', () => {
    expect(validateMembershipForm({ ...validForm, depositAmount: '' }, false)).toBe('첫 납부 금액을 입력하세요.');
  });

  it('수정 모드에서는 첫 납부 금액 불필요', () => {
    expect(validateMembershipForm({ ...validForm, depositAmount: '' }, true)).toBeNull();
  });

  // 양도 모드
  it('양도 모드: 금액 불필요, 납부일/결제방법 필수', () => {
    const transferForm = { ...validForm, price: '' };
    expect(validateMembershipForm(transferForm, false, true)).toBeNull();
  });

  it('양도 모드: 납부일 미입력', () => {
    expect(validateMembershipForm({ ...validForm, paymentDate: '' }, false, true)).toBe('양수금 납부일을 입력하세요.');
  });

  it('양도 모드: 결제방법 미선택', () => {
    expect(validateMembershipForm({ ...validForm, paymentMethod: '' }, false, true)).toBe('양수금 결제방법을 선택하세요.');
  });
});
