package com.culcom.dto.publiclink;

import com.culcom.dto.transfer.TransferRequestResponse;
import lombok.Builder;
import lombok.Getter;

/**
 * 양도 공개 링크 발급 응답. 모달 UI 가 잔여 횟수/양도비 등을 표시할 수 있도록
 * 기존 TransferRequestResponse 를 함께 담아 반환한다.
 */
@Getter
@Builder
public class PublicLinkTransferCreateResponse {
    private String code;
    private TransferRequestResponse transferRequest;
}
