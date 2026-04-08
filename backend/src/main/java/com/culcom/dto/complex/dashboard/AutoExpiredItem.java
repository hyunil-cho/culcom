package com.culcom.dto.complex.dashboard;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 당일 자동 만료된 멤버십 1건의 정보.
 * 사유는 노트의 키워드로 분류한다 (기간 만료 / 횟수 소진).
 */
@Getter
@Builder
public class AutoExpiredItem {
    private Long memberSeq;
    private String memberName;
    private String phoneNumber;
    private Long memberMembershipSeq;
    /** "기간만료" 또는 "횟수소진" */
    private String reason;
    /** 만료 처리 시각 */
    private LocalDateTime expiredAt;
    /** 활동 로그 노트 원본 */
    private String note;
}
