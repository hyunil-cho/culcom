package com.culcom.dto.complex;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BulkAttendanceResultResponse {
    private Long memberSeq;
    private String name;
    private String status;
}
