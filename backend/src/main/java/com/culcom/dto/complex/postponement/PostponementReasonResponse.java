package com.culcom.dto.complex.postponement;

import com.culcom.entity.complex.postponement.ComplexPostponementReason;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class PostponementReasonResponse {
    private Long seq;
    private String reason;
    private LocalDateTime createdDate;

    public static PostponementReasonResponse from(ComplexPostponementReason entity) {
        return PostponementReasonResponse.builder()
                .seq(entity.getSeq())
                .reason(entity.getReason())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
