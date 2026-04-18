package com.culcom.service;

import com.culcom.config.ZapierProperties;
import com.culcom.dto.publicapi.ZapierCustomerRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.customer.Customer;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.CustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Zapier 웹훅으로 받은 리드(잠재 고객)를 Customer 로 저장하는 시나리오:
 * - 시크릿 불일치/미설정은 AccessDeniedException
 * - location(Branch.alias) 존재 시 정상 저장, 존재하지 않으면 IllegalArgumentException (→ 400)
 * - 전화번호는 숫자만 남도록 정규화되어 저장
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ZapierServiceTest {

    @Autowired ZapierService zapierService;
    @Autowired BranchRepository branchRepository;
    @Autowired CustomerRepository customerRepository;
    @Autowired ZapierProperties zapierProperties;

    Branch branch;

    @BeforeEach
    void setUp() {
        zapierProperties.setSecret("test-secret");
        branch = branchRepository.save(Branch.builder()
                .branchName("강남")
                .alias("gangnam-" + System.nanoTime())
                .build());
    }

    @Test
    @DisplayName("시크릿 미설정 상태면 어떤 토큰이든 AccessDeniedException")
    void 시크릿_미설정() {
        zapierProperties.setSecret("");
        assertThatThrownBy(() -> zapierService.verifySecret("anything"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("잘못된 토큰이면 AccessDeniedException")
    void 토큰_불일치() {
        assertThatThrownBy(() -> zapierService.verifySecret("WRONG"))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> zapierService.verifySecret(null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("토큰이 일치하면 예외 없이 통과한다")
    void 토큰_일치() {
        zapierService.verifySecret("test-secret");
    }

    @Test
    @DisplayName("location(alias) 이 존재하면 Customer 로 저장된다")
    void 고객_정상_저장() {
        ZapierCustomerRequest req = new ZapierCustomerRequest();
        req.setName("홍길동");
        req.setPhone("010-1234-5678");
        req.setAdName("테스트상호");
        req.setAdSource("META");
        req.setLocation(branch.getAlias());

        Long seq = zapierService.createCustomer(req);

        Customer saved = customerRepository.findById(seq).orElseThrow();
        assertThat(saved.getName()).isEqualTo("홍길동");
        assertThat(saved.getPhoneNumber()).isEqualTo("01012345678");
        assertThat(saved.getCommercialName()).isEqualTo("테스트상호");
        assertThat(saved.getAdSource()).isEqualTo("META");
        assertThat(saved.getBranch().getSeq()).isEqualTo(branch.getSeq());
    }

    @Test
    @DisplayName("adName/adSource 는 비어있으면 null 로 저장")
    void 빈_광고정보_null_저장() {
        ZapierCustomerRequest req = new ZapierCustomerRequest();
        req.setName("홍길동");
        req.setPhone("01011112222");
        req.setAdName("   ");
        req.setAdSource("");
        req.setLocation(branch.getAlias());

        Long seq = zapierService.createCustomer(req);
        Customer saved = customerRepository.findById(seq).orElseThrow();
        assertThat(saved.getCommercialName()).isNull();
        assertThat(saved.getAdSource()).isNull();
    }

    @Test
    @DisplayName("location 이 존재하지 않으면 IllegalArgumentException (400)")
    void 지점_없음_400() {
        ZapierCustomerRequest req = new ZapierCustomerRequest();
        req.setName("홍길동");
        req.setPhone("01012345678");
        req.setLocation("no-such-alias");

        assertThatThrownBy(() -> zapierService.createCustomer(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("존재하지 않는 지점");
    }
}
