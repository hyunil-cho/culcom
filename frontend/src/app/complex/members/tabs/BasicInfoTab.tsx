'use client';

import FormField from '@/components/ui/FormField';
import { Input, PhoneInput, Select, Textarea } from '@/components/ui/FormInput';
import { useSignupChannels } from '@/lib/useSignupChannels';
import type { MemberFormData, StaffFormData } from '../memberFormTypes';

interface Props {
  form: MemberFormData;
  onChange: (form: MemberFormData) => void;
  isEdit?: boolean;
  staffForm?: StaffFormData;
  onStaffChange?: (f: StaffFormData) => void;
}

export default function BasicInfoTab({ form, onChange, isEdit, staffForm, onStaffChange }: Props) {
  const { channels: signupChannelConfigs } = useSignupChannels();
  const signupChannelLabels = signupChannelConfigs.map(c => c.code);
  const isStaff = staffForm?.isStaff ?? false;
  const signupSelectValue = signupChannelLabels.includes(form.signupChannel) ? form.signupChannel : (form.signupChannel ? '기타' : '');

  return (
    <>
      {/* 스태프 토글 */}
      {staffForm && onStaffChange && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.8rem 1rem', marginBottom: '1rem',
          background: isStaff ? '#eef2ff' : '#f8f9fa',
          borderRadius: 8, border: `1px solid ${isStaff ? '#c7d2fe' : '#e9ecef'}`,
          transition: 'all 0.2s',
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: isStaff ? '#4a90e2' : '#666' }}>
            {isStaff ? '스태프로 등록' : '일반 회원으로 등록'}
          </span>
          <div
            title={isEdit
              ? '회원/스태프 구분은 등록 후 변경할 수 없습니다.'
              : '회원/스태프 구분은 진입 경로에 따라 자동 설정됩니다.'}
            style={{
              width: 44, height: 24, borderRadius: 12, position: 'relative',
              background: isStaff ? '#4a90e2' : '#dee2e6',
              transition: 'background 0.2s',
              cursor: 'not-allowed',
              opacity: 0.6,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 2,
              left: isStaff ? 22 : 2,
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </div>
      )}

      <FormField label="이름" required>
        <Input placeholder="이름을 입력하세요" value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })} required />
      </FormField>
      <FormField label="전화번호" required>
        <PhoneInput value={form.phoneNumber}
          onChange={(e) => onChange({ ...form, phoneNumber: e.target.value })} required />
      </FormField>
      <FormField label="레벨">
        <Input placeholder="예: 3-" value={form.level}
          onChange={(e) => onChange({ ...form, level: e.target.value })} />
      </FormField>
      <FormField label="언어">
        <Input placeholder="예: 영어, 일본어" value={form.language}
          onChange={(e) => onChange({ ...form, language: e.target.value })} />
      </FormField>
      <FormField label="인터뷰어">
        <Input placeholder="인터뷰를 진행한 직원 이름" value={form.interviewer}
          onChange={(e) => onChange({ ...form, interviewer: e.target.value })} />
      </FormField>
      <FormField label="가입 경로">
        <div>
          <Select value={signupSelectValue}
            onChange={(e) => {
              if (e.target.value === '기타') onChange({ ...form, signupChannel: '기타' });
              else onChange({ ...form, signupChannel: e.target.value });
            }}>
            <option value="">-- 선택 --</option>
            {signupChannelLabels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            <option value="기타">기타 (직접입력)</option>
          </Select>
          {form.signupChannel && !signupChannelLabels.includes(form.signupChannel) && form.signupChannel !== '' && (
            <Input style={{ marginTop: 8 }} placeholder="가입 경로를 직접 입력하세요"
              value={form.signupChannel === '기타' ? '' : form.signupChannel}
              onChange={(e) => onChange({ ...form, signupChannel: e.target.value || '기타' })} />
          )}
        </div>
      </FormField>
      <FormField label="인적사항">
        <Input placeholder="예: 대학생, 영어회화 관심" value={form.info}
          onChange={(e) => onChange({ ...form, info: e.target.value })} />
      </FormField>
      <FormField label="특이사항">
        <Textarea style={{ height: 100 }} placeholder="직업, 관심사, 등록 동기 등 상세 정보를 입력하세요" value={form.comment}
          onChange={(e) => onChange({ ...form, comment: e.target.value })} />
      </FormField>
    </>
  );
}
