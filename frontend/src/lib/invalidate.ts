/**
 * React Query 캐시 무효화용 연관 키 그룹.
 *
 * 한 엔티티 변경이 다른 엔티티 뷰에도 영향을 주는 경우를 대비해
 * 도메인별 공통 키 집합을 정의한다. 각 문자열은 prefix 매칭되므로
 * 예: 'member' 는 ['member', 5] 같은 구체 키도 함께 무효화한다.
 */

import { queryClient } from './queryClient';

/** 멤버십·납부·미수금 등 멤버십 도메인 변경 시 함께 무효화할 키들 */
export const MEMBERSHIP_RELATED: string[] = [
  'memberMemberships',
  'member',
  'members',
  'outstanding',
  'membershipChanges',
  'paymentHistory',
  'complexDashboard',
];

/** 출석 변경 시 함께 무효화할 키들 (잔여 횟수가 변하므로 멤버십 관련 키도 포함) */
export const ATTENDANCE_RELATED: string[] = [
  'attendanceView',
  'attendanceViewDetail',
  'attendanceHistory',
  'attendanceHistorySummary',
  'members',
  'memberMemberships',
  'complexDashboard',
];

/** 전달된 키 배열을 일괄 invalidate (prefix 매칭) */
export function invalidateAll(keys: string[]) {
  keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
}
