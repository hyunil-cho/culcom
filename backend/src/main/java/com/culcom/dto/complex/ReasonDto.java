package com.culcom.dto.complex;

import com.culcom.entity.complex.BranchReason;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

public class ReasonDto {

    @Getter
    public static class Request {
        private String reason;
    }

    @Getter
    @Builder
    public static class Response {
        private Long seq;
        private String reason;
        private LocalDateTime createdDate;

        public static Response from(BranchReason entity) {
            return Response.builder()
                    .seq(entity.getSeq())
                    .reason(entity.getReason())
                    .createdDate(entity.getCreatedDate())
                    .build();
        }
    }
}
