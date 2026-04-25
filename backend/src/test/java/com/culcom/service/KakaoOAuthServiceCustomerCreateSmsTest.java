package com.culcom.service;

import com.culcom.config.KakaoOAuthProperties;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.CustomerRepository;
import com.culcom.repository.board.BoardAccountRepository;
import com.culcom.service.external.KakaoOAuthClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.never;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class KakaoOAuthServiceCustomerCreateSmsTest {

    @Mock KakaoOAuthProperties properties;
    @Mock ObjectMapper objectMapper;
    @Mock CustomerRepository customerRepository;
    @Mock BranchRepository branchRepository;
    @Mock BoardAccountRepository boardAccountRepository;
    @Mock KakaoOAuthClient kakaoOAuthClient;
    @Mock BoardSessionService boardSessionService;
    @Mock SmsService smsService;

    @InjectMocks KakaoOAuthService kakaoOAuthService;

    private static final Long BRANCH_SEQ = 1L;
    private static final Long KAKAO_ID = 12345L;
    private static final String CUSTOMER_NAME = "홍길동";
    private static final String CUSTOMER_PHONE = "01012345678";

    private Branch branch() {
        return Branch.builder()
                .seq(BRANCH_SEQ)
                .branchName("테스트지점")
                .alias("test")
                .build();
    }

    private KakaoOAuthService.KakaoUserInfo userInfo() {
        return new KakaoOAuthService.KakaoUserInfo(KAKAO_ID, CUSTOMER_NAME, CUSTOMER_PHONE, null);
    }

    @Test
    void 카카오_신규_고객_생성시_고객등록_SMS_이벤트가_발송되어야_한다() {
        Branch branch = branch();
        given(customerRepository.findByKakaoId(KAKAO_ID)).willReturn(Optional.empty());
        given(branchRepository.findById(99999L)).willReturn(Optional.of(branch));
        given(customerRepository.save(any(Customer.class)))
                .willAnswer(inv -> {
                    Customer c = inv.getArgument(0);
                    return Customer.builder()
                            .seq(99L)
                            .kakaoId(c.getKakaoId())
                            .name(c.getName())
                            .phoneNumber(c.getPhoneNumber())
                            .branch(c.getBranch())
                            .status(c.getStatus())
                            .build();
                });

        kakaoOAuthService.upsertCustomer(userInfo());

        then(smsService).should().sendEventSmsIfConfigured(
                BRANCH_SEQ, SmsEventType.고객등록, CUSTOMER_NAME, CUSTOMER_PHONE);
    }

    @Test
    void 카카오_기존_고객_재로그인시_SMS_이벤트가_발송되지_않아야_한다() {
        Customer existing = Customer.builder()
                .seq(50L)
                .kakaoId(KAKAO_ID)
                .name("이전이름")
                .phoneNumber("01099999999")
                .branch(branch())
                .status(CustomerStatus.신규)
                .build();
        given(customerRepository.findByKakaoId(KAKAO_ID)).willReturn(Optional.of(existing));
        given(customerRepository.save(any(Customer.class))).willAnswer(inv -> inv.getArgument(0));

        kakaoOAuthService.upsertCustomer(userInfo());

        then(smsService).should(never()).sendEventSmsIfConfigured(
                any(), any(), anyString(), anyString());
        then(smsService).should(never()).sendEventSmsIfConfigured(
                any(), any(), anyString(), anyString(), any());
    }
}
