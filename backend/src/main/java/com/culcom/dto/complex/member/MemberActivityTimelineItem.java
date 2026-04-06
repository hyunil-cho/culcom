package com.culcom.dto.complex.member;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MemberActivityTimelineItem {
    /** 이벤트 유형: MEMBERSHIP_REGISTER, POSTPONEMENT, REFUND, ATTENDANCE */
    private String type;
    private String date;
    private String title;
    private String detail;
    private String status;
}
