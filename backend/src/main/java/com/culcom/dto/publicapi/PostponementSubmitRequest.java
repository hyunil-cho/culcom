package com.culcom.dto.publicapi;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor
public class PostponementSubmitRequest {
    private String name;
    private String phone;
    private Long branchSeq;
    private Long memberSeq;
    private Long memberMembershipSeq;
    private String timeSlot;
    private String currentClass;
    private String startDate;
    private String endDate;
    private String reason;
}
