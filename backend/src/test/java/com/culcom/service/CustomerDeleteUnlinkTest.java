package com.culcom.service;

import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.repository.CustomerRepository;
import com.culcom.service.external.KakaoOAuthClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * 카카오로 로그인한 사용자를 삭제하면 (관리자 삭제 / 마이페이지 탈퇴 등 경로 무관)
 * 카카오 unlink API 가 호출됨을 검증한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CustomerDeleteUnlinkTest {

    @Autowired CustomerService customerService;
    @Autowired CustomerRepository customerRepository;

    @SpyBean KakaoOAuthClient kakaoOAuthClient;

    @Test
    @DisplayName("카카오 가입 고객 삭제 시 unlink API 가 kakaoId 로 호출된다")
    void 카카오_고객_삭제_시_unlink_호출() {
        Customer customer = customerRepository.save(Customer.builder()
                .name("카카오유저")
                .phoneNumber("01011110000")
                .kakaoId(12345L)
                .adSource("카카오")
                .status(CustomerStatus.신규)
                .build());

        clearInvocations(kakaoOAuthClient);

        customerService.delete(customer.getSeq());

        verify(kakaoOAuthClient, times(1)).unlinkUser(12345L);
        assertThat(customerRepository.findById(customer.getSeq())).isEmpty();
    }
}
