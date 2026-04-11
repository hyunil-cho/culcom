'use client';

import type { ReactNode } from 'react';
import FormField from '@/components/ui/FormField';
import { Select } from '@/components/ui/FormInput';
import { useClassSlots } from '../../hooks/useClassSlots';
import type { ClassAssignData } from '../memberFormTypes';

interface Props {
  membershipSection?: ReactNode;
  membershipEnabled?: boolean;
  classAssign?: ClassAssignData;
  onClassAssignChange?: (f: ClassAssignData) => void;
}

export default function ClassTab({ membershipSection, membershipEnabled, classAssign, onClassAssignChange }: Props) {
  const { timeSlots, getClassesBySlot } = useClassSlots();
  const filteredClasses = getClassesBySlot(classAssign?.timeSlotSeq);

  return (
    <>
      {membershipSection}

      {membershipEnabled && classAssign && onClassAssignChange && (
        <>
          <div style={{ borderTop: '2px solid #e9ecef', margin: '1.5rem 0 1rem', paddingTop: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#495057' }}>수업 배정</h3>
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
                <option key={c.seq} value={c.seq}>{c.name}</option>
              ))}
            </Select>
          </FormField>
        </>
      )}
    </>
  );
}
