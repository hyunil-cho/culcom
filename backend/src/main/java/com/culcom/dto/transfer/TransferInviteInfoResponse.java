package com.culcom.dto.transfer;

import com.culcom.dto.consent.ConsentItemResponse;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 양수자 초대 페이지에서 보여줄 정보.
 */
@Getter
@Builder
public class TransferInviteInfoResponse {
    private String membershipName;
    private String fromMemberName;
    private Integer remainingCount;
    private String expiryDate;
    private Integer transferFee;
    private List<ConsentItemResponse> consentItems;
}
