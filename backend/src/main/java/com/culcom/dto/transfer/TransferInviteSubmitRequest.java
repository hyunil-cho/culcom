package com.culcom.dto.transfer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * 양수자가 초대 페이지에서 제출하는 정보.
 */
@Getter
@Setter
public class TransferInviteSubmitRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String phoneNumber;
    /** 통화 가능 시각 */
    private String availableTime;
    @NotNull
    private List<ConsentAgreement> consents;

    @Getter
    @Setter
    public static class ConsentAgreement {
        @NotNull
        private Long consentItemSeq;
        @NotNull
        private Boolean agreed;
    }
}
