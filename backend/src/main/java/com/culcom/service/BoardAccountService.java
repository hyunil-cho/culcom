package com.culcom.service;

import com.culcom.dto.board.BoardLoginRequest;
import com.culcom.dto.board.BoardSignupRequest;
import com.culcom.entity.board.BoardAccount;
import com.culcom.entity.board.enums.BoardLoginType;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.consent.ConsentItem;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.customer.CustomerConsentHistory;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ConsentItemRepository;
import com.culcom.repository.CustomerConsentHistoryRepository;
import com.culcom.repository.CustomerRepository;
import com.culcom.repository.board.BoardAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BoardAccountService {

    private static final String SIGNUP_CATEGORY = "SIGNUP";

    private final BoardAccountRepository boardAccountRepository;
    private final CustomerRepository customerRepository;
    private final BranchRepository branchRepository;
    private final ConsentItemRepository consentItemRepository;
    private final CustomerConsentHistoryRepository customerConsentHistoryRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public BoardAccount signup(BoardSignupRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String phone = request.getPhoneNumber().replaceAll("[^0-9]", "");

        if (boardAccountRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("이미 가입된 이메일입니다");
        }
        if (customerRepository.existsByPhoneNumber(phone)) {
            throw new IllegalArgumentException("이미 가입된 전화번호입니다");
        }

        Map<Long, ConsentItem> signupConsents = validateSignupConsents(request.getConsents());

        Branch defaultBranch = branchRepository.findById(99999L)
                .orElse(branchRepository.findAll().stream().findFirst().orElse(null));

        Customer customer = customerRepository.save(Customer.builder()
                .name(request.getName())
                .phoneNumber(phone)
                .branch(defaultBranch)
                .adSource("게시판")
                .status(CustomerStatus.신규)
                .build());

        BoardAccount account = BoardAccount.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .phoneNumber(phone)
                .loginType(BoardLoginType.LOCAL)
                .customer(customer)
                .build();
        BoardAccount saved = boardAccountRepository.save(account);

        saveConsentHistories(customer, request.getConsents(), signupConsents);

        return saved;
    }

    /**
     * 제출된 동의 항목이 SIGNUP 카테고리 범위 내에 있는지 검증하고,
     * 필수 약관이 모두 동의되었는지 확인한다.
     */
    private Map<Long, ConsentItem> validateSignupConsents(List<BoardSignupRequest.ConsentAgreement> submitted) {
        List<ConsentItem> signupItems = consentItemRepository.findByCategory(SIGNUP_CATEGORY);
        Map<Long, ConsentItem> signupItemsBySeq = new HashMap<>();
        for (ConsentItem item : signupItems) {
            signupItemsBySeq.put(item.getSeq(), item);
        }

        Map<Long, Boolean> agreementMap = new HashMap<>();
        if (submitted != null) {
            for (BoardSignupRequest.ConsentAgreement a : submitted) {
                if (!signupItemsBySeq.containsKey(a.getConsentItemSeq())) {
                    throw new IllegalArgumentException("회원가입 약관이 아닌 항목이 포함되었습니다");
                }
                agreementMap.put(a.getConsentItemSeq(), Boolean.TRUE.equals(a.getAgreed()));
            }
        }

        for (ConsentItem item : signupItems) {
            if (Boolean.TRUE.equals(item.getRequired())
                    && !Boolean.TRUE.equals(agreementMap.get(item.getSeq()))) {
                throw new IllegalArgumentException("필수 약관에 동의해주세요: " + item.getTitle());
            }
        }

        return signupItemsBySeq;
    }

    private void saveConsentHistories(Customer customer,
                                      List<BoardSignupRequest.ConsentAgreement> submitted,
                                      Map<Long, ConsentItem> signupItemsBySeq) {
        if (submitted == null) return;
        for (BoardSignupRequest.ConsentAgreement a : submitted) {
            ConsentItem item = signupItemsBySeq.get(a.getConsentItemSeq());
            CustomerConsentHistory history = CustomerConsentHistory.builder()
                    .customer(customer)
                    .consentItem(item)
                    .contentSnapshot(item.getContent())
                    .agreed(Boolean.TRUE.equals(a.getAgreed()))
                    .version(item.getVersion())
                    .build();
            customerConsentHistoryRepository.save(history);
        }
    }

    @Transactional(readOnly = true)
    public BoardAccount login(BoardLoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        BoardAccount account = boardAccountRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호가 일치하지 않습니다"));

        if (account.getLoginType() == BoardLoginType.KAKAO) {
            throw new IllegalArgumentException("카카오 로그인으로 가입된 계정입니다. 카카오 로그인을 이용해주세요");
        }

        if (account.getPasswordHash() == null
                || !passwordEncoder.matches(request.getPassword(), account.getPasswordHash())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호가 일치하지 않습니다");
        }

        return account;
    }
}
