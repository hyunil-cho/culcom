import { describe, it, expect } from 'vitest';
import {
  emptyBranchForm,
  validateBranchForm,
  type BranchFormData,
} from '@/app/(main)/branches/BranchForm';

describe('emptyBranchForm', () => {
  it('모든 필드가 빈 문자열', () => {
    expect(emptyBranchForm).toEqual({
      branchName: '',
      alias: '',
      branchManager: '',
      address: '',
      directions: '',
    });
  });
});

describe('validateBranchForm', () => {
  const validForm: BranchFormData = {
    branchName: '강남점',
    alias: 'gangnam',
    branchManager: '',
    address: '',
    directions: '',
  };

  it('유효한 폼은 null 반환', () => {
    expect(validateBranchForm(validForm)).toBeNull();
  });

  it('지점명이 비어있으면 에러', () => {
    expect(validateBranchForm({ ...validForm, branchName: '' })).toBe('지점명을 입력해주세요.');
  });

  it('지점명이 공백만 있으면 에러', () => {
    expect(validateBranchForm({ ...validForm, branchName: '   ' })).toBe('지점명을 입력해주세요.');
  });

  it('별칭이 비어있으면 에러', () => {
    expect(validateBranchForm({ ...validForm, alias: '' })).toBe('별칭을 입력해주세요.');
  });

  it('별칭이 공백만 있으면 에러', () => {
    expect(validateBranchForm({ ...validForm, alias: '   ' })).toBe('별칭을 입력해주세요.');
  });

  it('별칭에 숫자가 포함되면 에러', () => {
    expect(validateBranchForm({ ...validForm, alias: 'gangnam1' })).toBe('별칭은 영문만 입력 가능합니다.');
  });

  it('별칭에 한글이 포함되면 에러', () => {
    expect(validateBranchForm({ ...validForm, alias: '강남' })).toBe('별칭은 영문만 입력 가능합니다.');
  });

  it('별칭에 공백이 섞이면 에러', () => {
    expect(validateBranchForm({ ...validForm, alias: 'gang nam' })).toBe('별칭은 영문만 입력 가능합니다.');
  });

  it('지점명과 별칭 모두 없으면 지점명 에러 우선', () => {
    expect(validateBranchForm({ ...validForm, branchName: '', alias: '' })).toBe('지점명을 입력해주세요.');
  });

  it('대소문자 혼합 영문 별칭은 허용', () => {
    expect(validateBranchForm({ ...validForm, alias: 'GangNam' })).toBeNull();
  });

  it('필수 외 필드가 비어있어도 통과', () => {
    expect(validateBranchForm({
      branchName: '강남점',
      alias: 'gangnam',
      branchManager: '',
      address: '',
      directions: '',
    })).toBeNull();
  });
});
