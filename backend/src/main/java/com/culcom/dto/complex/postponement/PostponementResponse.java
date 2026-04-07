package com.culcom.dto.complex.postponement;

import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.enums.RequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
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
    private String rejectReason;
    private LocalDateTime createdDate;

    public static PostponementResponse from(ComplexPostponementRequest entity) {
        return PostponementResponse.builder()
                .seq(entity.getSeq())
                .memberName(entity.getMemberName())
                .phoneNumber(entity.getPhoneNumber())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .reason(entity.getReason())
                .status(entity.getStatus())
                .rejectReason(entity.getRejectReason())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
