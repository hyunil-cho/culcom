'use client';

import { useMemo } from 'react';
import { timeslotApi, classApi, type ClassTimeSlot, type ComplexClass, type PageResponse } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';

/**
 * 시간대 목록 + 수업 목록을 로드하고,
 * 선택된 시간대에 해당하는 수업만 필터링하는 공통 hook.
 *
 * - timeSlots: 전체 시간대 목록
 * - allClasses: 전체 수업 목록
 * - getClassesBySlot(slotSeq): 특정 시간대의 수업 목록
 */
export function useClassSlots() {
  const { data: timeSlots = [] } = useApiQuery<ClassTimeSlot[]>(
    ['timeslots'],
    () => timeslotApi.list(),
  );

  const { data: classPageData } = useApiQuery<PageResponse<ComplexClass>>(
    ['classes', 'all'],
    () => classApi.list('size=200'),
  );

  const allClasses = classPageData?.content ?? [];

  const classesBySlot = useMemo(() => {
    const map = new Map<number, ComplexClass[]>();
    for (const c of allClasses) {
      if (c.timeSlotSeq) {
        const list = map.get(c.timeSlotSeq) || [];
        list.push(c);
        map.set(c.timeSlotSeq, list);
      }
    }
    return map;
  }, [allClasses]);

  const getClassesBySlot = (slotSeq: number | string | undefined): ComplexClass[] => {
    if (!slotSeq) return [];
    return classesBySlot.get(Number(slotSeq)) || [];
  };

  return { timeSlots, allClasses, getClassesBySlot };
}
