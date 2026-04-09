package com.culcom.dto.transfer;

import lombok.Builder;
import lombok.Getter;

/**
 * 양도자 공개 페이지에서 보여줄 정보.
 * 토큰으로 조회, 민감 정보 제외.
 */
@Getter
@Builder
public class TransferPublicInfoResponse {
    private String membershipName;
    private String fromMemberName;
    private Integer remainingCount;
    private String expiryDate;
    private Integer transferFee;
    private String status;
    private String inviteToken;
}
