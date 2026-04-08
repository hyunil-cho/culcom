package com.culcom.entity.enums;

/**
 * 멤버십의 본질 상태.
 * - 활성: 정상 사용 가능
 * - 정지: 일시적으로 사용 불가 (예: 스태프 휴직). 가역적.
 * - 만료: 횟수 소진 또는 기간 만료로 더 이상 사용 불가. 새 멤버십 등록을 유도.
 * - 환불: 환불 처리됨 (이력 보존, 사용 불가). 비가역적.
 *
 * 연기는 본 enum의 값이 아니다. 연기는 기간을 가진 별도 사건이며
 * {@code complex_postponement_requests} 테이블에서 관리한다.
 */
public enum MembershipStatus {
    활성,
    정지,
    만료,
    환불
}