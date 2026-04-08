package com.culcom.dto.complex.dashboard;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 대시보드의 멤버십 알림 3개 위젯 데이터를 한 번에 반환.
 */
@Getter
@Builder
public class MembershipAlertsResponse {
    /** 만료 임박 (today < expiryDate <= today + windowDays) */
    private List<MembershipAlertItem> expiringSoon;
    /** 이미 만료 (today - windowDays <= expiryDate < today) */
    private List<MembershipAlertItem> recentlyExpired;
    /** 잔여 횟수 임박 (remainingCount <= countThreshold) */
    private List<MembershipAlertItem> lowRemaining;
    /** 오늘 자동 만료 처리된 멤버십 (스케줄러/출석 트리거 통합) */
    private List<AutoExpiredItem> autoExpiredToday;
    /** 응답 시 사용된 파라미터 (UI 표시용) */
    private int windowDays;
    private int countThreshold;
}
