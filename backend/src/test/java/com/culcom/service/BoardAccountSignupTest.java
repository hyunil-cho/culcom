package com.culcom.service;

import com.culcom.dto.board.BoardSignupRequest;
import com.culcom.entity.board.BoardAccount;
import com.culcom.entity.board.enums.BoardLoginType;
import com.culcom.entity.consent.ConsentItem;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.customer.CustomerConsentHistory;
import com.culcom.repository.ConsentItemRepository;
import com.culcom.repository.CustomerConsentHistoryRepository;
import com.culcom.repository.CustomerRepository;
import com.culcom.repository.board.BoardAccountRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 보드 회원가입 시 Customer 레코드가 함께 생성되고,
 * BoardAccount 가 Customer 에 올바르게 연결되며,
 * SIGNUP 카테고리 약관 동의 이력이 기록됨을 검증한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class BoardAccountSignupTest {

    @Autowired BoardAccountService boardAccountService;
    @Autowired BoardAccountRepository boardAccountRepository;
    @Autowired CustomerRepository customerRepository;
    @Autowired ConsentItemRepository consentItemRepository;
    @Autowired CustomerConsentHistoryRepository customerConsentHistoryRepository;

    @Test
    @DisplayName("회원가입 성공 시 BoardAccount + Customer 가 모두 생성되고 연결된다")
    void 회원가입_시_Customer_생성() {
        BoardSignupRequest request = buildRequest("New@Example.com", "010-4444-0000");

        BoardAccount account = boardAccountService.signup(request);

        assertThat(account.getSeq()).isNotNull();
        assertThat(account.getEmail()).isEqualTo("new@example.com");
        assertThat(account.getLoginType()).isEqualTo(BoardLoginType.LOCAL);
        assertThat(account.getPasswordHash()).isNotBlank().isNotEqualTo("password123");

        Customer customer = account.getCustomer();
        assertThat(customer).isNotNull();
        assertThat(customer.getSeq()).isNotNull();
        assertThat(customer.getName()).isEqualTo("테스터");
        assertThat(customer.getPhoneNumber()).isEqualTo("01044440000");

        assertThat(customerRepository.findById(customer.getSeq())).isPresent();
        assertThat(boardAccountRepository.findByEmail("new@example.com"))
                .isPresent()
                .get()
                .extracting(b -> b.getCustomer().getSeq())
                .isEqualTo(customer.getSeq());
    }

    @Test
    @DisplayName("이미 가입된 이메일로 회원가입 시 실패한다")
    void 이메일_중복_차단() {
        BoardSignupRequest first = buildRequest("dup@example.com", "010-5555-0001");
        boardAccountService.signup(first);

        BoardSignupRequest second = buildRequest("dup@example.com", "010-5555-0002");

        assertThatThrownBy(() -> boardAccountService.signup(second))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("이메일");
    }

    @Test
    @DisplayName("이미 존재하는 전화번호로 회원가입 시 실패한다 (카카오 사용자 포함)")
    void 전화번호_중복_차단() {
        customerRepository.save(Customer.builder()
                .name("기존카카오")
                .phoneNumber("01066660000")
                .kakaoId(999L)
                .build());

        BoardSignupRequest request = buildRequest("other@example.com", "010-6666-0000");

        assertThatThrownBy(() -> boardAccountService.signup(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("전화번호");
    }

    @Test
    @DisplayName("회원가입 시 SIGNUP 약관 동의 이력이 Customer 에 저장된다")
    void 회원가입_시_약관_동의_이력_저장() {
        ConsentItem requiredItem = consentItemRepository.save(ConsentItem.builder()
                .title("서비스 이용약관")
                .content("이용약관 전문")
                .required(true)
                .category("SIGNUP")
                .version(3)
                .build());
        ConsentItem optionalItem = consentItemRepository.save(ConsentItem.builder()
                .title("마케팅 수신 동의")
                .content("마케팅 수신 전문")
                .required(false)
                .category("SIGNUP")
                .version(1)
                .build());

        BoardSignupRequest request = buildRequest("consent@example.com", "010-7777-0000");
        request.setConsents(List.of(
                agreement(requiredItem.getSeq(), true),
                agreement(optionalItem.getSeq(), false)
        ));

        BoardAccount account = boardAccountService.signup(request);

        List<CustomerConsentHistory> histories =
                customerConsentHistoryRepository.findByCustomerSeq(account.getCustomer().getSeq());

        assertThat(histories).hasSize(2);

        CustomerConsentHistory required = histories.stream()
                .filter(h -> h.getConsentItem().getSeq().equals(requiredItem.getSeq()))
                .findFirst().orElseThrow();
        assertThat(required.getAgreed()).isTrue();
        assertThat(required.getVersion()).isEqualTo(3);
        assertThat(required.getContentSnapshot()).isEqualTo("이용약관 전문");

        CustomerConsentHistory optional = histories.stream()
                .filter(h -> h.getConsentItem().getSeq().equals(optionalItem.getSeq()))
                .findFirst().orElseThrow();
        assertThat(optional.getAgreed()).isFalse();
        assertThat(optional.getVersion()).isEqualTo(1);
    }

    @Test
    @DisplayName("필수 SIGNUP 약관에 미동의 시 회원가입이 실패한다")
    void 필수_약관_미동의_차단() {
        ConsentItem requiredItem = consentItemRepository.save(ConsentItem.builder()
                .title("서비스 이용약관")
                .content("이용약관 전문")
                .required(true)
                .category("SIGNUP")
                .version(1)
                .build());

        BoardSignupRequest request = buildRequest("no-consent@example.com", "010-7777-1111");
        request.setConsents(List.of(agreement(requiredItem.getSeq(), false)));

        assertThatThrownBy(() -> boardAccountService.signup(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("필수 약관");

        assertThat(boardAccountRepository.findByEmail("no-consent@example.com")).isEmpty();
    }

    @Test
    @DisplayName("필수 SIGNUP 약관이 제출 목록에서 아예 빠진 경우에도 실패한다")
    void 필수_약관_누락_차단() {
        consentItemRepository.save(ConsentItem.builder()
                .title("서비스 이용약관")
                .content("이용약관 전문")
                .required(true)
                .category("SIGNUP")
                .version(1)
                .build());

        BoardSignupRequest request = buildRequest("missing-consent@example.com", "010-7777-2222");
        // consents 비움

        assertThatThrownBy(() -> boardAccountService.signup(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("필수 약관");
    }

    @Test
    @DisplayName("SIGNUP 이 아닌 카테고리 약관이 제출되면 실패한다")
    void 비_SIGNUP_카테고리_약관_차단() {
        ConsentItem transferItem = consentItemRepository.save(ConsentItem.builder()
                .title("양도 약관")
                .content("양도 전문")
                .required(true)
                .category("TRANSFER")
                .version(1)
                .build());

        BoardSignupRequest request = buildRequest("wrong-cat@example.com", "010-7777-3333");
        request.setConsents(List.of(agreement(transferItem.getSeq(), true)));

        assertThatThrownBy(() -> boardAccountService.signup(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("회원가입 약관");
    }

    private BoardSignupRequest buildRequest(String email, String phone) {
        BoardSignupRequest r = new BoardSignupRequest();
        r.setEmail(email);
        r.setPassword("password123");
        r.setName("테스터");
        r.setPhoneNumber(phone);
        return r;
    }

    private BoardSignupRequest.ConsentAgreement agreement(Long seq, boolean agreed) {
        BoardSignupRequest.ConsentAgreement a = new BoardSignupRequest.ConsentAgreement();
        a.setConsentItemSeq(seq);
        a.setAgreed(agreed);
        return a;
    }
}
