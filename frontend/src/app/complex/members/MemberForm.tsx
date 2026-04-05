'use client';

import { useEffect, useState } from 'react';
import FormField from '@/components/ui/FormField';
import FormLayout from '@/components/ui/FormLayout';
import { Input, PhoneInput, Select, Textarea } from '@/components/ui/FormInput';
import { membershipApi, type Membership } from '@/lib/api';
import { useClassSlots } from '../hooks/useClassSlots';

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

export interface MembershipFormData {
  membershipSeq: string;
  startDate: string;
  expiryDate: string;
  price: string;
  paymentDate: string;
  status: string;
  depositAmount: string;
  paymentMethod: string;
}

export interface ClassAssignData {
  timeSlotSeq: string;
  classSeq: string;
}

export const emptyMemberForm: MemberFormData = {
  name: '', phoneNumber: '', level: '', language: '', info: '',
  chartNumber: '', signupChannel: '', interviewer: '', comment: '',
};

export const emptyMembershipForm: MembershipFormData = {
  membershipSeq: '', startDate: '', expiryDate: '', price: '',
  paymentDate: '', status: '', depositAmount: '', paymentMethod: '',
};

export const emptyClassAssign: ClassAssignData = { timeSlotSeq: '', classSeq: '' };

export function validateMemberForm(form: MemberFormData): string | null {
  if (!form.name.trim()) return '이름을 입력하세요.';
  if (!form.phoneNumber.trim()) return '전화번호를 입력하세요.';
  return null;
}

const SIGNUP_CHANNELS = ['인스타그램', '네이버 검색', '지인 소개', '전단지', '홈페이지'];
const PAYMENT_METHODS = ['카드', '온라인구독', '온라인신용', '토스링크', '이체(개인통장)', '이체(법인통장)', '현금'];
const STATUSES = ['미가입/예정', '디파짓', '양도/6개월미만', '가입(완불)'];

export default function MemberForm({
  form, onChange, onSubmit, isEdit, backHref, submitLabel,
  membershipForm, onMembershipChange,
  classAssign, onClassAssignChange,
}: {
  form: MemberFormData;
  onChange: (form: MemberFormData) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  backHref: string;
  submitLabel: string;
  membershipForm?: MembershipFormData;
  onMembershipChange?: (f: MembershipFormData) => void;
  classAssign?: ClassAssignData;
  onClassAssignChange?: (f: ClassAssignData) => void;
}) {
  const { timeSlots, getClassesBySlot } = useClassSlots();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const filteredClasses = getClassesBySlot(classAssign?.timeSlotSeq);

  useEffect(() => {
    membershipApi.list().then(res => { if (res.success) setMemberships(res.data); });
  }, []);

  // 멤버십 선택 시 만료일 자동 계산
  const handleMembershipSelect = (membershipSeq: string) => {
    if (!onMembershipChange || !membershipForm) return;
    const updated = { ...membershipForm, membershipSeq };
    if (membershipSeq) {
      const ms = memberships.find(m => m.seq === Number(membershipSeq));
      if (ms && membershipForm.startDate) {
        const start = new Date(membershipForm.startDate);
        start.setDate(start.getDate() + ms.duration);
        updated.expiryDate = start.toISOString().split('T')[0];
      }
    }
    onMembershipChange(updated);
  };

  const handleStartDateChange = (startDate: string) => {
    if (!onMembershipChange || !membershipForm) return;
    const updated = { ...membershipForm, startDate };
    if (membershipForm.membershipSeq) {
      const ms = memberships.find(m => m.seq === Number(membershipForm.membershipSeq));
      if (ms && startDate) {
        const start = new Date(startDate);
        start.setDate(start.getDate() + ms.duration);
        updated.expiryDate = start.toISOString().split('T')[0];
      }
    }
    onMembershipChange(updated);
  };

  const setNow = (field: 'startDate' | 'paymentDate') => {
    if (!onMembershipChange || !membershipForm) return;
    const now = new Date();
    if (field === 'startDate') {
      handleStartDateChange(now.toISOString().split('T')[0]);
    } else {
      const pad = (n: number) => String(n).padStart(2, '0');
      const val = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
      onMembershipChange({ ...membershipForm, paymentDate: val });
    }
  };

  const signupSelectValue = SIGNUP_CHANNELS.includes(form.signupChannel) ? form.signupChannel : (form.signupChannel ? '기타' : '');
  const paymentSelectValue = membershipForm
    ? (PAYMENT_METHODS.includes(membershipForm.paymentMethod) ? membershipForm.paymentMethod : (membershipForm.paymentMethod ? '기타' : ''))
    : '';

  return (
    <FormLayout
      title={submitLabel === '등록' ? '새 회원 등록' : '회원 정보 수정'}
      backHref={backHref} submitLabel={submitLabel}
      onSubmit={onSubmit} isEdit={isEdit}
    >
      {/* ── 기본 정보 ── */}
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

      {/* ── 수업 배정 (선택사항) ── */}
      {classAssign && onClassAssignChange && (
        <>
          <div style={{ borderTop: '2px solid #e9ecef', margin: '1.5rem 0 1rem', paddingTop: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057' }}>수업 배정 (선택사항)</h3>
          </div>
          <FormField label="수업 시간대">
            <Select value={classAssign.timeSlotSeq}
              onChange={(e) => onClassAssignChange({ timeSlotSeq: e.target.value, classSeq: '' })}>
              <option value="">-- 시간대 선택 --</option>
              {timeSlots.map(ts => (
                <option key={ts.seq} value={ts.seq}>
                  {ts.name} ({ts.daysOfWeek} {ts.startTime} ~ {ts.endTime})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="배정 수업">
            <Select value={classAssign.classSeq} disabled={!classAssign.timeSlotSeq}
              onChange={(e) => onClassAssignChange({ ...classAssign, classSeq: e.target.value })}>
              <option value="">{classAssign.timeSlotSeq ? '-- 수업 선택 --' : '-- 시간대를 먼저 선택하세요 --'}</option>
              {filteredClasses.map(c => (
                <option key={c.seq} value={c.seq}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>
        </>
      )}

      {/* ── 인적사항 ── */}
      <div style={{ borderTop: '2px solid #e9ecef', margin: '1.5rem 0 1rem', paddingTop: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057' }}>추가 정보</h3>
      </div>
      <FormField label="인적사항">
        <Input placeholder="예: 대학생, 영어회화 관심" value={form.info}
          onChange={(e) => onChange({ ...form, info: e.target.value })} />
      </FormField>
      <FormField label="가입 경로">
        <div>
          <Select value={signupSelectValue}
            onChange={(e) => {
              if (e.target.value === '기타') onChange({ ...form, signupChannel: '기타' });
              else onChange({ ...form, signupChannel: e.target.value });
            }}>
            <option value="">-- 선택 --</option>
            {SIGNUP_CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            <option value="기타">기타 (직접입력)</option>
          </Select>
          {form.signupChannel && !SIGNUP_CHANNELS.includes(form.signupChannel) && form.signupChannel !== '' && (
            <Input style={{ marginTop: 8 }} placeholder="가입 경로를 직접 입력하세요"
              value={form.signupChannel === '기타' ? '' : form.signupChannel}
              onChange={(e) => onChange({ ...form, signupChannel: e.target.value || '기타' })} />
          )}
        </div>
      </FormField>
      <FormField label="인터뷰어">
        <Input placeholder="인터뷰어 이름을 입력하세요" value={form.interviewer}
          onChange={(e) => onChange({ ...form, interviewer: e.target.value })} />
      </FormField>
      <FormField label="차트넘버">
        <Input placeholder="차트 번호를 입력하세요" value={form.chartNumber}
          onChange={(e) => onChange({ ...form, chartNumber: e.target.value })} />
      </FormField>
      <FormField label="코멘트">
        <Textarea style={{ height: 100 }} placeholder="직업, 관심사, 등록 동기 등 상세 정보를 입력하세요" value={form.comment}
          onChange={(e) => onChange({ ...form, comment: e.target.value })} />
      </FormField>

      {/* ── 멤버십 할당 (선택사항) ── */}
      {membershipForm && onMembershipChange && (
        <>
          <div style={{ borderTop: '2px solid #e9ecef', margin: '1.5rem 0 1rem', paddingTop: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057' }}>멤버십 할당 (선택사항)</h3>
          </div>
          <FormField label="가입일">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Input type="date" style={{ flex: 1 }} value={membershipForm.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', fontSize: '0.85rem', color: '#555', cursor: 'pointer' }}>
                <input type="checkbox" onChange={(e) => { if (e.target.checked) setNow('startDate'); }} /> 오늘 날짜
              </label>
            </div>
          </FormField>
          <FormField label="등급 (멤버십)">
            <Select value={membershipForm.membershipSeq}
              onChange={(e) => handleMembershipSelect(e.target.value)}>
              <option value="">-- 멤버십 선택 --</option>
              {memberships.map(ms => (
                <option key={ms.seq} value={ms.seq}>{ms.name} ({ms.duration}일)</option>
              ))}
            </Select>
          </FormField>
          <FormField label="만료일" hint="* 멤버십 선택 시 자동으로 기간이 산정됩니다.">
            <Input type="date" value={membershipForm.expiryDate} readOnly
              style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }} />
          </FormField>
          <FormField label="금액">
            <Input placeholder="예: 450,000" value={membershipForm.price}
              onChange={(e) => onMembershipChange({ ...membershipForm, price: e.target.value })} />
          </FormField>
          <FormField label="납부일">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Input type="datetime-local" style={{ flex: 1 }} value={membershipForm.paymentDate}
                onChange={(e) => onMembershipChange({ ...membershipForm, paymentDate: e.target.value })} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', fontSize: '0.85rem', color: '#555', cursor: 'pointer' }}>
                <input type="checkbox" onChange={(e) => { if (e.target.checked) setNow('paymentDate'); }} /> 현재시간
              </label>
            </div>
          </FormField>
          <FormField label="상태">
            <Select value={membershipForm.status}
              onChange={(e) => {
                const updated = { ...membershipForm, status: e.target.value };
                if (e.target.value !== '디파짓') updated.depositAmount = '';
                onMembershipChange(updated);
              }}>
              <option value="">-- 선택 --</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>
          {membershipForm.status === '디파짓' && (
            <FormField label="디파짓 납부금액">
              <Input placeholder="예: 100,000" value={membershipForm.depositAmount}
                onChange={(e) => onMembershipChange({ ...membershipForm, depositAmount: e.target.value })} />
            </FormField>
          )}
          <FormField label="결제방법">
            <div>
              <Select value={paymentSelectValue}
                onChange={(e) => {
                  if (e.target.value === '기타') onMembershipChange({ ...membershipForm, paymentMethod: '기타' });
                  else onMembershipChange({ ...membershipForm, paymentMethod: e.target.value });
                }}>
                <option value="">-- 선택 --</option>
                {PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                <option value="기타">기타 (직접입력)</option>
              </Select>
              {membershipForm.paymentMethod && !PAYMENT_METHODS.includes(membershipForm.paymentMethod) && membershipForm.paymentMethod !== '' && (
                <Input style={{ marginTop: 8 }} placeholder="결제방법을 직접 입력하세요"
                  value={membershipForm.paymentMethod === '기타' ? '' : membershipForm.paymentMethod}
                  onChange={(e) => onMembershipChange({ ...membershipForm, paymentMethod: e.target.value || '기타' })} />
              )}
            </div>
          </FormField>
        </>
      )}
    </FormLayout>
  );
}
