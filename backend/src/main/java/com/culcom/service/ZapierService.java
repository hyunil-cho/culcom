package com.culcom.service;

import com.culcom.config.ZapierProperties;
import com.culcom.dto.publicapi.ZapierCustomerRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ZapierService {

    private final ZapierProperties zapierProperties;
    private final BranchRepository branchRepository;
    private final CustomerRepository customerRepository;

    /**
     * Zapier 웹훅 시크릿 검증.
     * 서버 설정값이 비어있거나 요청 토큰이 일치하지 않으면 AccessDeniedException.
     */
    public void verifySecret(String token) {
        String expected = zapierProperties.getSecret();
        if (expected == null || expected.isBlank()) {
            log.warn("Zapier 시크릿이 서버에 설정되지 않아 모든 요청을 거부합니다.");
            throw new AccessDeniedException("웹훅 시크릿이 서버에 설정되지 않았습니다.");
        }
        if (!expected.equals(token)) {
            log.warn("Zapier 시크릿 검증 실패");
            throw new AccessDeniedException("유효하지 않은 웹훅 토큰입니다.");
        }
    }

    @Transactional
    public Long createCustomer(ZapierCustomerRequest request) {
        Branch branch = branchRepository.findByAlias(request.getLocation())
                .orElseThrow(() -> new IllegalArgumentException(
                        "존재하지 않는 지점입니다: " + request.getLocation()));

        String phone = normalizePhone(request.getPhone());

        Customer customer = Customer.builder()
                .branch(branch)
                .name(request.getName().trim())
                .phoneNumber(phone)
                .commercialName(blankToNull(request.getAdName()))
                .adSource(blankToNull(request.getAdSource()))
                .callCount(0)
                .status(CustomerStatus.신규)
                .kakaoId(null)
                .build();

        Customer saved = customerRepository.save(customer);
        log.info("Zapier 고객 생성 완료: seq={}, branchAlias={}", saved.getSeq(), branch.getAlias());
        return saved.getSeq();
    }

    private String normalizePhone(String raw) {
        if (raw == null) return null;
        return raw.replaceAll("\\D", "");
    }

    private String blankToNull(String s) {
        if (s == null) return null;
        String trimmed = s.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
