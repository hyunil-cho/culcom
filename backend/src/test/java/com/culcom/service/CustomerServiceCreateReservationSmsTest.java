package com.culcom.service;

import com.culcom.dto.customer.CustomerReservationResponse;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.repository.*;
import com.culcom.repository.board.BoardAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerServiceCreateReservationSmsTest {

    @Mock CustomerRepository customerRepository;
    @Mock BranchRepository branchRepository;
    @Mock CallerSelectionHistoryRepository callerSelectionHistoryRepository;
    @Mock ReservationInfoRepository reservationInfoRepository;
    @Mock UserInfoRepository userInfoRepository;
    @Mock BoardAccountRepository boardAccountRepository;
    @Mock CustomerConsentHistoryRepository customerConsentHistoryRepository;
    @Mock TransferRequestRepository transferRequestRepository;
    @Mock KakaoOAuthService kakaoOAuthService;
    @Mock SmsService smsService;

    @InjectMocks CustomerService customerService;

    private static final Long BRANCH_SEQ = 1L;
    private static final Long CUSTOMER_SEQ = 10L;
    private static final Long USER_SEQ = 100L;
    private static final String INTERVIEW_DATE = "2026-04-20 10:00";

    private Customer customer;

    @BeforeEach
    void setUp() {
        Branch branch = Branch.builder().seq(BRANCH_SEQ).branchName("테스트지점").alias("test").build();
        customer = Customer.builder()
                .seq(CUSTOMER_SEQ)
                .name("홍길동")
                .phoneNumber("01012345678")
                .branch(branch)
                .status(CustomerStatus.신규)
                .build();
        given(customerRepository.findById(CUSTOMER_SEQ)).willReturn(Optional.of(customer));
    }

    @Test
    void 예약_확정시_예약확정_SMS_발송() {
        customerService.createReservation(CUSTOMER_SEQ, "A", INTERVIEW_DATE, BRANCH_SEQ, USER_SEQ);

        then(smsService).should().sendEventSmsIfConfigured(
                eq(BRANCH_SEQ), eq(SmsEventType.예약확정),
                eq("홍길동"), eq("01012345678"), anyMap());
    }

    @Test
    void 예약_확정시_인터뷰_일시가_extraContext로_전달된다() {
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, String>> captor = ArgumentCaptor.forClass(Map.class);

        customerService.createReservation(CUSTOMER_SEQ, "A", INTERVIEW_DATE, BRANCH_SEQ, USER_SEQ);

        then(smsService).should().sendEventSmsIfConfigured(
                anyLong(), eq(SmsEventType.예약확정), anyString(), anyString(), captor.capture());
        Map<String, String> context = captor.getValue();
        assertThat(context).containsEntry("{reservation.interview_date}", INTERVIEW_DATE);
        assertThat(context).containsEntry("{reservation.interview_datetime}", INTERVIEW_DATE);
    }

    @Test
    void SMS_정상_발송시_smsWarning은_null이다() {
        given(smsService.sendEventSmsIfConfigured(anyLong(), any(), anyString(), anyString(), anyMap()))
                .willReturn(null);

        CustomerReservationResponse response = customerService.createReservation(
                CUSTOMER_SEQ, "A", INTERVIEW_DATE, BRANCH_SEQ, USER_SEQ);

        assertThat(response.getSmsWarning()).isNull();
    }

    @Test
    void SMS_설정_미등록시_경고가_response에_담긴다() {
        given(smsService.sendEventSmsIfConfigured(anyLong(), any(), anyString(), anyString(), anyMap()))
                .willReturn("문자 자동발송 설정이 등록되지 않아 발송하지 못했습니다.");

        CustomerReservationResponse response = customerService.createReservation(
                CUSTOMER_SEQ, "A", INTERVIEW_DATE, BRANCH_SEQ, USER_SEQ);

        assertThat(response.getSmsWarning())
                .isEqualTo("문자 자동발송 설정이 등록되지 않아 발송하지 못했습니다.");
    }

    @Test
    void SMS_자동발송_비활성화시_경고가_response에_담긴다() {
        given(smsService.sendEventSmsIfConfigured(anyLong(), any(), anyString(), anyString(), anyMap()))
                .willReturn("문자 자동발송이 비활성화 상태입니다.");

        CustomerReservationResponse response = customerService.createReservation(
                CUSTOMER_SEQ, "A", INTERVIEW_DATE, BRANCH_SEQ, USER_SEQ);

        assertThat(response.getSmsWarning()).isEqualTo("문자 자동발송이 비활성화 상태입니다.");
    }

    @Test
    void SMS_발송_실패시_경고가_response에_담긴다() {
        given(smsService.sendEventSmsIfConfigured(anyLong(), any(), anyString(), anyString(), anyMap()))
                .willReturn("문자 발송 실패: 잔여 건수 부족");

        CustomerReservationResponse response = customerService.createReservation(
                CUSTOMER_SEQ, "A", INTERVIEW_DATE, BRANCH_SEQ, USER_SEQ);

        assertThat(response.getSmsWarning()).isEqualTo("문자 발송 실패: 잔여 건수 부족");
    }

    @Test
    void 예약_확정시_고객_상태가_예약확정으로_변경된다() {
        customerService.createReservation(CUSTOMER_SEQ, "A", INTERVIEW_DATE, BRANCH_SEQ, USER_SEQ);

        assertThat(customer.getStatus()).isEqualTo(CustomerStatus.예약확정);
    }
}
