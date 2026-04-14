import { SurveyQuestion } from '@/lib/api';

export const BASIC_INFO_FIELDS = [
  { key: 'name' as const, title: '성함', type: 'text', placeholder: '홍길동' },
  { key: 'phone' as const, title: '연락처', type: 'tel', placeholder: '010-0000-0000' },
  { key: 'gender' as const, title: '성별', type: 'radio', options: ['남성', '여성'] },
  { key: 'location' as const, title: '사는 곳', type: 'text', placeholder: '예) 서울 강남구 역삼동', hint: '동까지만 입력' },
  { key: 'age_group' as const, title: '연령대', type: 'radio', options: ['10대', '20대', '30대', '40대', '50대 이상'] },
  { key: 'occupation' as const, title: '현재 직군', type: 'radio', options: ['학생', '직장인', '자영업', '프리랜서', '주부', '기타'] },
  { key: 'ad_source' as const, title: 'E-UT를 어떻게 알고 오셨나요?', type: 'radio', options: ['인스타그램', '블로그', '유튜브', '지인 추천', '기타'] },
] as const;

export type BasicInfoKey = typeof BASIC_INFO_FIELDS[number]['key'];

export function getFieldOptions(
  template: { customerFieldOptions?: Record<string, string[]> | null } | null,
  key: string,
): string[] | undefined {
  const field = BASIC_INFO_FIELDS.find(f => f.key === key);
  if (!field || !('options' in field)) return undefined;
  const custom = template?.customerFieldOptions?.[key];
  return custom && custom.length > 0 ? custom : [...field.options];
}

export function hintText(q: SurveyQuestion): string {
  if (q.inputType === 'text') return '주관식';
  if (q.inputType === 'checkbox') return '중복 선택 가능';
  return '하나만 선택';
}

export function questionsForSection(questions: SurveyQuestion[], sectionSeq: number) {
  return questions.filter(q => q.sectionSeq === sectionSeq);
}
