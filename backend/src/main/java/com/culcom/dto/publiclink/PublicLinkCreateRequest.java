package com.culcom.dto.publiclink;

import com.culcom.entity.enums.PublicLinkKind;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * 일반 공개 링크 발급 요청 (멤버십·연기·환불).
 *
 * 양도 종류는 별도 endpoint(`/transfer`)가 처리하므로 여기서 받지 않는다.
 * kind 별 추가 필드 검증은 Service 단계에서 수행한다.
 */
@Getter
@Setter
public class PublicLinkCreateRequest {
    @NotNull
    private Long memberSeq;

    @NotNull
    private PublicLinkKind kind;

    /** 환불 종류 시 필수 */
    private Long memberMembershipSeq;

    /** 환불 종류 시 필수 */
    private Integer refundAmount;
}
