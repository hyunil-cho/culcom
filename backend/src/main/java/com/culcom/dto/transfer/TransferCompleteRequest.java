package com.culcom.dto.transfer;

import com.culcom.dto.complex.member.CardPaymentDetailDto;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 양도 완료 (양수자 회원 등록과 함께 멤버십 이전) 요청.
 * 양수자가 양도비를 납부한 결제 정보를 함께 전달해, 양수자 측 멤버십 납부 기록에 반영한다.
 */
@Data
public class TransferCompleteRequest {
    /** 양수금 결제방법 (카드/현금/계좌이체 등). 미지정 시 납부 기록의 method는 null. */
    private String paymentMethod;
    /** 양수금 납부 시각. 미지정 시 서버 현재 시각으로 기록. */
    private LocalDateTime paymentDate;
    /** 카드 결제인 경우 카드 상세 정보. 카드가 아니면 무시. */
    private CardPaymentDetailDto cardDetail;
}
