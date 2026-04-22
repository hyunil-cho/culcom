package com.culcom.dto.complex.postponement;

import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.enums.RequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostponementResponse {
    private Long seq;
    private String memberName;
    private String phoneNumber;
    /** 연기가 적용된 회원의 해당 멤버십 이름 — 어떤 멤버십을 사용하던 중 연기했는지 식별용 */
    private String membershipName;
    private LocalDate startDate;
    private LocalDate endDate;
    private String reason;
    private RequestStatus status;
    private String adminMessage;
    private LocalDateTime createdDate;
    private String desiredClassName;
    private String desiredTimeSlotName;
    private String desiredStartTime;
    private String desiredEndTime;

    /** SMS 자동발송 경고 메시지 (정상 발송/미설정 시 null) */
    private String smsWarning;

    public static PostponementResponse from(ComplexPostponementRequest entity) {
        ComplexClass dc = entity.getDesiredClass();
        String membershipName = entity.getMemberMembership() != null
                && entity.getMemberMembership().getMembership() != null
                ? entity.getMemberMembership().getMembership().getName() : null;
        return PostponementResponse.builder()
                .seq(entity.getSeq())
                .memberName(entity.getMemberName())
                .phoneNumber(entity.getPhoneNumber())
                .membershipName(membershipName)
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .reason(entity.getReason())
                .status(entity.getStatus())
                .adminMessage(entity.getAdminMessage())
                .createdDate(entity.getCreatedDate())
                .desiredClassName(dc != null ? dc.getName() : null)
                .desiredTimeSlotName(dc != null && dc.getTimeSlot() != null ? dc.getTimeSlot().getName() : null)
                .desiredStartTime(dc != null && dc.getTimeSlot() != null && dc.getTimeSlot().getStartTime() != null
                        ? dc.getTimeSlot().getStartTime().toString() : null)
                .desiredEndTime(dc != null && dc.getTimeSlot() != null && dc.getTimeSlot().getEndTime() != null
                        ? dc.getTimeSlot().getEndTime().toString() : null)
                .build();
    }
}
