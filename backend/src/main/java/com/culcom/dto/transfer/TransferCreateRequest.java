package com.culcom.dto.transfer;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TransferCreateRequest {
    @NotNull
    private Long memberMembershipSeq;

    /**
     * 관리자가 직접 지정한 양도비. null이면 서비스에서 잔여 횟수 기반으로 자동 계산한다.
     */
    private Integer transferFee;
}
