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

    public static PostponementResponse from(ComplexPostponementRequest entity) {
        ComplexClass dc = entity.getDesiredClass();
        return PostponementResponse.builder()
                .seq(entity.getSeq())
                .memberName(entity.getMemberName())
                .phoneNumber(entity.getPhoneNumber())
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
