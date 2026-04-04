package com.culcom.dto.complex.attendance;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class BulkAttendanceRequest {
    private Long classSeq;
    private List<BulkMember> members;

    @Getter
    @Setter
    public static class BulkMember {
        private Long memberSeq;
        private boolean staff;
        private boolean attended;
    }
}
