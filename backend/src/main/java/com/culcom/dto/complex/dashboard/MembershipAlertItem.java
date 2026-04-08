package com.culcom.dto.complex.dashboard;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

/**
 * 대시보드 알림 위젯의 단일 항목.
 * 만료 임박 / 이미 만료 / 잔여 횟수 임박 위젯에서 공통으로 사용한다.
 */
@Getter
@Builder
public class MembershipAlertItem {
    private Long memberSeq;
    private String memberName;
    private String phoneNumber;
    private Long memberMembershipSeq;
    private String membershipName;
    private LocalDate expiryDate;
    /** 오늘과의 차이(일). 양수=앞으로, 음수=과거. */
    private Long daysFromToday;
    private Integer totalCount;
    private Integer usedCount;
    /** totalCount - usedCount */
    private Integer remainingCount;
}
