package com.culcom.dto.complex.attendance;

import com.culcom.entity.enums.BulkAttendanceResultStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BulkAttendanceResultResponse {
    private Long memberSeq;
    private String name;
    private BulkAttendanceResultStatus status;
}
