package com.culcom.dto.complex;

import com.culcom.entity.ComplexPostponementRequest;
import com.culcom.entity.enums.RequestStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class PostponementResponse {
    private Long seq;
    private String memberName;
    private String phoneNumber;
    private String timeSlot;
    private String currentClass;
    private LocalDate startDate;
    private LocalDate endDate;
    private String reason;
    private RequestStatus status;
    private String rejectReason;
    private LocalDateTime createdDate;

    public static PostponementResponse from(ComplexPostponementRequest entity) {
        return PostponementResponse.builder()
                .seq(entity.getSeq())
                .memberName(entity.getMemberName())
                .phoneNumber(entity.getPhoneNumber())
                .timeSlot(entity.getTimeSlot())
                .currentClass(entity.getCurrentClass())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .reason(entity.getReason())
                .status(entity.getStatus())
                .rejectReason(entity.getRejectReason())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
