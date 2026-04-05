package com.culcom.dto.publicapi;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor
public class PostponementSubmitRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String phone;
    @NotNull
    private Long branchSeq;
    @NotNull
    private Long memberSeq;
    @NotNull
    private Long memberMembershipSeq;
    private String timeSlot;
    private String currentClass;
    private String startDate;
    private String endDate;
    private String reason;
}
