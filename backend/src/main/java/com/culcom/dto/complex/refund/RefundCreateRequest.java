package com.culcom.dto.complex.refund;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RefundCreateRequest {
    @NotNull
    private Long memberSeq;
    @NotNull
    private Long memberMembershipSeq;
    @NotBlank
    private String memberName;
    private String phoneNumber;
    private String membershipName;
    private String price;
    private String reason;
}
