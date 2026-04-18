package com.culcom.dto.transfer;

import com.culcom.entity.enums.TransferStatus;
import com.culcom.entity.transfer.TransferRequest;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class TransferRequestResponse {
    private Long seq;
    private Long memberMembershipSeq;
    private Long membershipSeq;
    private String membershipName;
    private String expiryDate;
    private Long fromMemberSeq;
    private String fromMemberName;
    private String fromMemberPhone;
    private TransferStatus status;
    private Integer transferFee;
    private Integer remainingCount;
    private String token;
    private String inviteToken;
    private Long toCustomerSeq;
    private String toCustomerName;
    private String toCustomerPhone;
    private String adminMessage;
    private Boolean referenced;
    private LocalDateTime createdDate;

    public static TransferRequestResponse from(TransferRequest entity) {
        return TransferRequestResponse.builder()
                .seq(entity.getSeq())
                .memberMembershipSeq(entity.getMemberMembership().getSeq())
                .membershipSeq(entity.getMemberMembership().getMembership().getSeq())
                .membershipName(entity.getMemberMembership().getMembership().getName())
                .expiryDate(entity.getMemberMembership().getExpiryDate() != null
                        ? entity.getMemberMembership().getExpiryDate().toString() : null)
                .fromMemberSeq(entity.getFromMember().getSeq())
                .fromMemberName(entity.getFromMember().getName())
                .fromMemberPhone(entity.getFromMember().getPhoneNumber())
                .status(entity.getStatus())
                .transferFee(entity.getTransferFee())
                .remainingCount(entity.getRemainingCount())
                .token(entity.getToken())
                .inviteToken(entity.getInviteToken())
                .toCustomerSeq(entity.getToCustomer() != null ? entity.getToCustomer().getSeq() : null)
                .toCustomerName(entity.getToCustomer() != null ? entity.getToCustomer().getName() : null)
                .toCustomerPhone(entity.getToCustomer() != null ? entity.getToCustomer().getPhoneNumber() : null)
                .adminMessage(entity.getAdminMessage())
                .referenced(entity.getReferenced())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
