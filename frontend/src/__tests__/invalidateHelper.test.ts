/**
 * `src/lib/invalidate.ts` 유닛 테스트.
 *
 * 핵심 계약 검증:
 * - invalidateAll(keys) 은 각 키를 queryKey: [key] 형태로 queryClient.invalidateQueries 에 전달한다.
 * - MEMBERSHIP_RELATED / ATTENDANCE_RELATED 상수는 반드시 포함되어야 할 연관 키들을 가진다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

import { queryClient } from '@/lib/queryClient';
import { invalidateAll, MEMBERSHIP_RELATED, ATTENDANCE_RELATED } from '@/lib/invalidate';

describe('invalidate helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidateAll은 각 키마다 queryKey prefix 형태로 invalidateQueries를 호출한다', () => {
    invalidateAll(['a', 'b', 'c']);

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ['a'] });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ['b'] });
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(3, { queryKey: ['c'] });
  });

  it('invalidateAll에 빈 배열을 넘기면 호출이 일어나지 않는다', () => {
    invalidateAll([]);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it('MEMBERSHIP_RELATED는 멤버십·납부·미수금·대시보드 관련 키를 포함한다', () => {
    for (const k of [
      'memberMemberships',
      'member',
      'members',
      'outstanding',
      'membershipChanges',
      'paymentHistory',
      'complexDashboard',
    ]) {
      expect(MEMBERSHIP_RELATED, `MEMBERSHIP_RELATED should contain "${k}"`).toContain(k);
    }
  });

  it('ATTENDANCE_RELATED는 출석 뷰와 잔여횟수·대시보드 관련 키를 포함한다', () => {
    for (const k of [
      'attendanceView',
      'attendanceViewDetail',
      'attendanceHistory',
      'attendanceHistorySummary',
      'members',
      'memberMemberships',
      'complexDashboard',
    ]) {
      expect(ATTENDANCE_RELATED, `ATTENDANCE_RELATED should contain "${k}"`).toContain(k);
    }
  });
});
