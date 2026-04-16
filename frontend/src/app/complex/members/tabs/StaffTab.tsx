'use client';

import { useState } from 'react';
import FormField from '@/components/ui/FormField';
import { Input, Select, CurrencyInput } from '@/components/ui/FormInput';
import { useClassSlots } from '../../hooks/useClassSlots';
import { usePaymentOptions } from '@/lib/usePaymentOptions';
import type { StaffFormData, ClassAssignData } from '../memberFormTypes';

const STAFF_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '활동중', label: '활동 중 (Active)' },
  { value: '활동중단', label: '활동 중단 (Paused)' },
  { value: '활동종료', label: '활동 종료 (Completed)' },
];

interface Props {
  staffForm: StaffFormData;
  onStaffChange: (f: StaffFormData) => void;
  staffClassAssign?: ClassAssignData;
  onStaffClassAssignChange?: (f: ClassAssignData) => void;
  currentMemberSeq?: number;
}

export default function StaffTab({ staffForm, onStaffChange, staffClassAssign, onStaffClassAssignChange, currentMemberSeq }: Props) {
  const { timeSlots, getClassesBySlot } = useClassSlots();
  const { methods: paymentMethods, banks: bankOptions } = usePaymentOptions();
  const [statusWarning, setStatusWarning] = useState<string | null>(null);

  const handleStatusChange = (next: string) => {
    const prev = staffForm.status;
    if (prev === '활동중' && (next === '활동중단' || next === '활동종료')) {
      const label = next === '활동중단' ? '활동 중단' : '활동 종료';
      setStatusWarning(
        `재직 상태를 '${label}'(으)로 변경하면 다음이 적용됩니다.\n\n` +
        `· 스태프 내부 멤버십이 정지되어 더 이상 사용할 수 없습니다.\n` +
        `· 참여 중인 모든 수업에서 제외됩니다.\n` +
        `· 강사로 배정된 수업에서 해제됩니다.\n\n` +
        `저장 시 위 내용이 자동으로 반영됩니다.`
      );
    }
    onStaffChange({ ...staffForm, status: next });
  };

  return (
    <>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#495057' }}>스태프 상태</h3>
      <FormField label="상태">
        <Select value={staffForm.status}
          onChange={(e) => handleStatusChange(e.target.value)}>
          {STAFF_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </FormField>

      {statusWarning && (
        <div
          onClick={(e) => e.target === e.currentTarget && setStatusWarning(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div style={{
            background: '#fff', borderRadius: 8, padding: '1.5rem',
            maxWidth: 440, width: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#b91c1c' }}>
              ⚠ 재직 상태 변경 경고
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {statusWarning}
            </p>
            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setStatusWarning(null)}
                style={{
                  padding: '8px 20px', background: '#4a90e2', color: '#fff',
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {staffClassAssign && onStaffClassAssignChange && (
        <>
          <div style={{ borderTop: '2px solid #e9ecef', margin: '1.5rem 0 1rem', paddingTop: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057' }}>담당 수업</h3>
          </div>
          <FormField label="수업 시간대">
            <Select value={staffClassAssign.timeSlotSeq}
              onChange={(e) => onStaffClassAssignChange({ timeSlotSeq: e.target.value, classSeq: '' })}>
              <option value="">-- 시간대 선택 --</option>
              {timeSlots.map(ts => (
                <option key={ts.seq} value={ts.seq}>
                  {ts.name} ({ts.daysOfWeek} {ts.startTime} ~ {ts.endTime})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="배정 수업">
            <Select value={staffClassAssign.classSeq} disabled={!staffClassAssign.timeSlotSeq}
              onChange={(e) => onStaffClassAssignChange({ ...staffClassAssign, classSeq: e.target.value })}>
              <option value="">{staffClassAssign.timeSlotSeq ? '-- 수업 선택 --' : '-- 시간대를 먼저 선택하세요 --'}</option>
              {getClassesBySlot(staffClassAssign.timeSlotSeq)
                .filter(c => !c.staffSeq || c.staffSeq === currentMemberSeq)
                .map(c => <option key={c.seq} value={c.seq}>{c.name}</option>)}
            </Select>
          </FormField>
        </>
      )}

      {/* 환급 정보 */}
      <div style={{ borderTop: '2px solid #e9ecef', margin: '1.5rem 0 1rem', paddingTop: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057' }}>환급 정보</h3>
      </div>
      <FormField label="결제방식">
        <Select value={staffForm.refund.paymentMethod}
          onChange={(e) => onStaffChange({ ...staffForm, refund: { ...staffForm.refund, paymentMethod: e.target.value } })}>
          <option value="">-- 선택 --</option>
          {paymentMethods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
      </FormField>
      <FormField label="디파짓 금액">
        <CurrencyInput placeholder="예: 500,000" value={staffForm.refund.depositAmount}
          onValueChange={(v) => onStaffChange({ ...staffForm, refund: { ...staffForm.refund, depositAmount: v } })} />
      </FormField>
      <FormField label="환급 예정 디파짓">
        <CurrencyInput placeholder="예: 300,000" value={staffForm.refund.refundableDeposit}
          onValueChange={(v) => onStaffChange({ ...staffForm, refund: { ...staffForm.refund, refundableDeposit: v } })} />
      </FormField>
      <FormField label="환급불가 디파짓">
        <CurrencyInput placeholder="예: 200,000" value={staffForm.refund.nonRefundableDeposit}
          onValueChange={(v) => onStaffChange({ ...staffForm, refund: { ...staffForm.refund, nonRefundableDeposit: v } })} />
      </FormField>
      <FormField label="환급 은행">
        <Select value={staffForm.refund.refundBank}
          onChange={(e) => onStaffChange({ ...staffForm, refund: { ...staffForm.refund, refundBank: e.target.value } })}>
          <option value="">-- 은행 선택 --</option>
          {bankOptions.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
        </Select>
      </FormField>
      <FormField label="환급 계좌번호">
        <Input placeholder="예: 110-123-456789" value={staffForm.refund.refundAccount}
          onChange={(e) => onStaffChange({ ...staffForm, refund: { ...staffForm.refund, refundAccount: e.target.value } })} />
      </FormField>
      <FormField label="환급 금액">
        <CurrencyInput placeholder="예: 200,000" value={staffForm.refund.refundAmount}
          onValueChange={(v) => onStaffChange({ ...staffForm, refund: { ...staffForm.refund, refundAmount: v } })} />
      </FormField>
    </>
  );
}
