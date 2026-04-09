package com.culcom.dto.transfer;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TransferCreateRequest {
    @NotNull
    private Long memberMembershipSeq;
}
