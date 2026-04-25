package com.culcom.dto.publiclink;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * 양도 공개 링크 발급 요청. 한 트랜잭션 내에서 TransferRequest 생성 + PublicLink 발급을 수행한다.
 */
@Getter
@Setter
public class PublicLinkCreateTransferRequest {
    @NotNull
    private Long memberMembershipSeq;

    /** 관리자가 직접 지정한 양도비. null이면 잔여 횟수 기반으로 자동 계산된다. */
    private Integer transferFee;
}
