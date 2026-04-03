package com.culcom.dto.complex;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class PostponementCreateRequest {
    private Long memberSeq;
    private Long memberMembershipSeq;
    private String memberName;
    private String phoneNumber;
    private String timeSlot;
    private String currentClass;
    private LocalDate startDate;
    private LocalDate endDate;
    private String reason;
}
