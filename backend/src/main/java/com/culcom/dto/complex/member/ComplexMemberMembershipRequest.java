package com.culcom.dto.complex.member;

import com.culcom.entity.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class ComplexMemberMembershipRequest {
    @NotNull
    private Long membershipSeq;
    private LocalDate startDate;
    private LocalDate expiryDate;
    private String price;
    private String depositAmount;
    private PaymentMethod paymentMethod;
    private LocalDateTime paymentDate;
    private Boolean isActive;
}
