'use client';

import FormField from '@/components/ui/FormField';
import FormLayout from '@/components/ui/FormLayout';
import { Input, PhoneInput, Select, Textarea } from '@/components/ui/FormInput';

export interface MemberFormData {
  name: string;
  phoneNumber: string;
  level: string;
  language: string;
  info: string;
  chartNumber: string;
  signupChannel: string;
  interviewer: string;
  comment: string;
}

export const emptyMemberForm: MemberFormData = {
  name: '',
  phoneNumber: '',
  level: '',
  language: '',
  info: '',
  chartNumber: '',
  signupChannel: '',
  interviewer: '',
  comment: '',
};

export function validateMemberForm(form: MemberFormData): string | null {
  if (!form.name.trim()) return '이름을 입력하세요.';
  if (!form.phoneNumber.trim()) return '전화번호를 입력하세요.';
  return null;
}

export default function MemberForm({
  form, onChange, onSubmit, isEdit, backHref, submitLabel,
}: {
  form: MemberFormData;
  onChange: (form: MemberFormData) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  backHref: string;
  submitLabel: string;
}) {
  return (
    <FormLayout
      title={submitLabel === '등록' ? '회원 등록' : '회원 정보 수정'}
      backHref={backHref} submitLabel={submitLabel}
      onSubmit={onSubmit} isEdit={isEdit}
    >
      <FormField label="이름" required>
        <Input placeholder="이름" value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })} required />
      </FormField>
      <FormField label="전화번호" required>
        <PhoneInput value={form.phoneNumber}
          onChange={(e) => onChange({ ...form, phoneNumber: e.target.value })} required />
      </FormField>
      <FormField label="레벨">
        <Input placeholder="예: 초급, 중급" value={form.level}
          onChange={(e) => onChange({ ...form, level: e.target.value })} />
      </FormField>
      <FormField label="언어">
        <Input placeholder="예: 영어, 일본어" value={form.language}
          onChange={(e) => onChange({ ...form, language: e.target.value })} />
      </FormField>
      <FormField label="인적사항">
        <Input placeholder="예: 대학생, 영어회화 관심" value={form.info}
          onChange={(e) => onChange({ ...form, info: e.target.value })} />
      </FormField>
      <FormField label="차트번호">
        <Input placeholder="차트번호" value={form.chartNumber}
          onChange={(e) => onChange({ ...form, chartNumber: e.target.value })} />
      </FormField>
      <FormField label="가입 경로">
        <div>
          <Select value={['인스타그램', '네이버 검색', '지인 소개', '전단지', '홈페이지'].includes(form.signupChannel) ? form.signupChannel : (form.signupChannel ? '기타' : '')}
            onChange={(e) => {
              if (e.target.value === '기타') onChange({ ...form, signupChannel: '기타' });
              else onChange({ ...form, signupChannel: e.target.value });
            }}>
            <option value="">-- 선택 --</option>
            <option value="인스타그램">인스타그램</option>
            <option value="네이버 검색">네이버 검색</option>
            <option value="지인 소개">지인 소개</option>
            <option value="전단지">전단지</option>
            <option value="홈페이지">홈페이지</option>
            <option value="기타">기타 (직접입력)</option>
          </Select>
          {!['', '인스타그램', '네이버 검색', '지인 소개', '전단지', '홈페이지'].includes(form.signupChannel) && (
            <Input style={{ marginTop: 8 }} placeholder="가입 경로를 직접 입력하세요" value={form.signupChannel === '기타' ? '' : form.signupChannel}
              onChange={(e) => onChange({ ...form, signupChannel: e.target.value || '기타' })} />
          )}
        </div>
      </FormField>
      <FormField label="인터뷰어">
        <Input placeholder="인터뷰어 이름을 입력하세요" value={form.interviewer}
          onChange={(e) => onChange({ ...form, interviewer: e.target.value })} />
      </FormField>
      <FormField label="메모">
        <Textarea style={{ height: 80 }} placeholder="메모" value={form.comment}
          onChange={(e) => onChange({ ...form, comment: e.target.value })} />
      </FormField>
    </FormLayout>
  );
}
