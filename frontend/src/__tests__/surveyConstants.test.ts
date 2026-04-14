import { describe, it, expect } from 'vitest';
import { BASIC_INFO_FIELDS, hintText, questionsForSection } from '@/app/survey/[seq]/_shared/surveyConstants';
import type { SurveyQuestion } from '@/lib/api';

describe('BASIC_INFO_FIELDS', () => {
  it('7개 필드 정의', () => {
    expect(BASIC_INFO_FIELDS).toHaveLength(7);
  });

  it('필수 필드 키 포함: name, phone, gender, location, age_group, occupation, ad_source', () => {
    const keys = BASIC_INFO_FIELDS.map(f => f.key);
    expect(keys).toEqual(['name', 'phone', 'gender', 'location', 'age_group', 'occupation', 'ad_source']);
  });

  it('name은 text 타입', () => {
    const nameField = BASIC_INFO_FIELDS.find(f => f.key === 'name')!;
    expect(nameField.type).toBe('text');
    expect(nameField.title).toBe('성함');
  });

  it('phone은 tel 타입', () => {
    const phoneField = BASIC_INFO_FIELDS.find(f => f.key === 'phone')!;
    expect(phoneField.type).toBe('tel');
  });

  it('gender는 radio, 남성/여성 옵션', () => {
    const genderField = BASIC_INFO_FIELDS.find(f => f.key === 'gender')!;
    expect(genderField.type).toBe('radio');
    expect((genderField as any).options).toEqual(['남성', '여성']);
  });

  it('age_group은 radio, 5개 옵션', () => {
    const field = BASIC_INFO_FIELDS.find(f => f.key === 'age_group')!;
    expect(field.type).toBe('radio');
    expect((field as any).options).toHaveLength(5);
  });

  it('occupation은 radio, 6개 옵션', () => {
    const field = BASIC_INFO_FIELDS.find(f => f.key === 'occupation')!;
    expect((field as any).options).toHaveLength(6);
  });

  it('ad_source는 radio, 5개 옵션', () => {
    const field = BASIC_INFO_FIELDS.find(f => f.key === 'ad_source')!;
    expect((field as any).options).toHaveLength(5);
    expect((field as any).options).toContain('인스타그램');
  });
});

describe('hintText', () => {
  const makeQ = (inputType: string): SurveyQuestion => ({
    seq: 1, templateSeq: 1, sectionSeq: 1,
    questionKey: 'q1', title: '질문', inputType,
    isGrouped: false, groupLabel: null, sortOrder: 1, required: false,
  });

  it('text → "주관식"', () => {
    expect(hintText(makeQ('text'))).toBe('주관식');
  });

  it('checkbox → "중복 선택 가능"', () => {
    expect(hintText(makeQ('checkbox'))).toBe('중복 선택 가능');
  });

  it('radio → "하나만 선택"', () => {
    expect(hintText(makeQ('radio'))).toBe('하나만 선택');
  });

  it('기타 타입 → "하나만 선택"', () => {
    expect(hintText(makeQ('unknown'))).toBe('하나만 선택');
  });
});

describe('questionsForSection', () => {
  const questions: SurveyQuestion[] = [
    { seq: 1, templateSeq: 1, sectionSeq: 10, questionKey: 'q1', title: 'A', inputType: 'text', isGrouped: false, groupLabel: null, sortOrder: 1, required: false },
    { seq: 2, templateSeq: 1, sectionSeq: 20, questionKey: 'q2', title: 'B', inputType: 'radio', isGrouped: false, groupLabel: null, sortOrder: 1, required: true },
    { seq: 3, templateSeq: 1, sectionSeq: 10, questionKey: 'q3', title: 'C', inputType: 'checkbox', isGrouped: false, groupLabel: null, sortOrder: 2, required: false },
  ];

  it('해당 sectionSeq의 질문만 필터링', () => {
    const result = questionsForSection(questions, 10);
    expect(result).toHaveLength(2);
    expect(result.map(q => q.seq)).toEqual([1, 3]);
  });

  it('없는 sectionSeq는 빈 배열', () => {
    expect(questionsForSection(questions, 999)).toEqual([]);
  });

  it('빈 질문 배열', () => {
    expect(questionsForSection([], 10)).toEqual([]);
  });
});
