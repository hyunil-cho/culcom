package com.culcom.entity.enums;

/**
 * 일괄 출석 처리 결과 상태.
 *
 * <p>처리 경로:
 * <ul>
 *   <li>{@link #멤버십없음} — 사용 가능한 멤버십이 없어 건너뜀</li>
 *   <li>{@link #횟수소진} — 한도 도달로 추가 출석 거부</li>
 *   <li>{@link #이미처리됨} — 같은 날 동일 상태로 이미 기록됨</li>
 *   <li>{@link #출석}/{@link #결석} — 신규 기록 (usedCount +1)</li>
 *   <li>{@link #출석변경}/{@link #결석변경} — 같은 날 기존 기록을 다른 상태로 변경 (usedCount 변화 없음)</li>
 * </ul>
 */
public enum BulkAttendanceResultStatus {
    멤버십없음,
    횟수소진,
    이미처리됨,
    출석,
    결석,
    출석변경,
    결석변경
}
