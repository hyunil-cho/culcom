package com.culcom.config.datas;

import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.settings.BankConfig;
import com.culcom.entity.complex.settings.PaymentMethodConfig;
import com.culcom.entity.enums.UserRole;
import com.culcom.entity.product.Membership;
import com.culcom.entity.integration.ExternalServiceType;
import com.culcom.entity.integration.ThirdPartyService;
import com.culcom.entity.message.MessageTemplate;
import com.culcom.entity.message.Placeholder;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserInfoRepository userInfoRepository;
    private final ExternalServiceTypeRepository externalServiceTypeRepository;
    private final ThirdPartyServiceRepository thirdPartyServiceRepository;
    private final PlaceholderRepository placeholderRepository;
    private final PasswordEncoder passwordEncoder;
    private final MembershipRepository membershipRepository;
    private final PaymentMethodConfigRepository paymentMethodConfigRepository;
    private final BankConfigRepository bankConfigRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (userInfoRepository.findByUserId("root").isEmpty()) {
            UserInfo root = UserInfo.builder()
                    .userId("root")
                    .userPassword(passwordEncoder.encode("root"))
                    .role(UserRole.ROOT)
                    .build();
            userInfoRepository.save(root);
            log.info("초기 계정 생성: root/root (ROOT)");
        }

        initThirdPartyServices();
        initPlaceholders();
        initStaffMembership();
        initPaymentMethods();
        initBanks();
    }

    private void initBanks() {
        if (bankConfigRepository.count() > 0) return;
        String[][] seeds = {
                {"KB", "국민은행"},
                {"SHINHAN", "신한은행"},
                {"WOORI", "우리은행"},
                {"HANA", "하나은행"},
                {"NH", "농협은행"},
                {"IBK", "기업은행"},
                {"KAKAO", "카카오뱅크"},
                {"TOSS", "토스뱅크"},
                {"K", "케이뱅크"},
        };
        int order = 0;
        for (String[] s : seeds) {
            bankConfigRepository.save(BankConfig.builder()
                    .code(s[0]).label(s[1]).sortOrder(order++).isActive(true).build());
        }
        log.info("초기 은행 시드 {}건 생성", seeds.length);
    }

    private void initPaymentMethods() {
        if (paymentMethodConfigRepository.count() > 0) return;
        String[][] seeds = {
                {"CARD", "카드"},
                {"ONLINE_SUBSCRIPTION", "온라인구독"},
                {"ONLINE_CREDIT", "온라인신용"},
                {"TOSS_LINK", "토스링크"},
                {"BANK_TRANSFER_PERSONAL", "이체(개인통장)"},
                {"BANK_TRANSFER_CORPORATE", "이체(법인통장)"},
                {"CASH", "현금"},
                {"OTHER", "기타"},
        };
        int order = 0;
        for (String[] s : seeds) {
            paymentMethodConfigRepository.save(PaymentMethodConfig.builder()
                    .code(s[0]).label(s[1]).sortOrder(order++).isActive(true).build());
        }
        log.info("초기 결제 수단 시드 {}건 생성", seeds.length);
    }

    private void initThirdPartyServices() {
        ExternalServiceType smsType = externalServiceTypeRepository.findByCodeName("SMS")
                .orElseGet(() -> {
                    ExternalServiceType type = ExternalServiceType.builder()
                            .codeName("SMS")
                            .build();
                    externalServiceTypeRepository.save(type);
                    log.info("초기 외부 서비스 타입 생성: SMS");
                    return type;
                });

        ThirdPartyService mymunja = thirdPartyServiceRepository.findByName("마이문자")
                .orElseGet(() -> {
                    ThirdPartyService service = ThirdPartyService.builder()
                            .name("마이문자")
                            .description("마이문자 연동 서비스")
                            .externalServiceType(smsType)
                            .build();
                    thirdPartyServiceRepository.save(service);
                    log.info("초기 서드파티 서비스 생성: 마이문자");
                    return service;
                });
    }

    private void initPlaceholders() {
        if (placeholderRepository.count() > 0) {
            return;
        }

        placeholderRepository.save(Placeholder.builder().name("{{고객명}}").comment("고객의 이름").examples("홍길동").value("{customer.name}").build());
        placeholderRepository.save(Placeholder.builder().name("{{전화번호}}").comment("고객의 전화번호").examples("010-1234-5678").value("{customer.phone_number}").build());
        placeholderRepository.save(Placeholder.builder().name("{{지점명}}").comment("소속 지점 이름").examples("강남지점").value("{branch.name}").build());
        placeholderRepository.save(Placeholder.builder().name("{{현재날짜}}").comment("오늘 날짜").examples("2026-01-27").value("{system.current_date}").build());
        placeholderRepository.save(Placeholder.builder().name("{{현재시간}}").comment("현재 시각").examples("14:30").value("{system.current_time}").build());
        placeholderRepository.save(Placeholder.builder().name("{{현재날짜시간}}").comment("현재 날짜와 시각").examples("2026-01-27 14:30").value("{system.current_datetime}").build());
        placeholderRepository.save(Placeholder.builder().name("{{예약일자}}").comment("예약 확정 일시").examples("2026년 2월 15일 14:30").value("{reservation.interview_date}").build());
        placeholderRepository.save(Placeholder.builder().name("{{예약시간}}").comment("예약 확정 날짜와 시간").examples("2026년 2월 15일 오후 2:30").value("{reservation.interview_datetime}").build());
        placeholderRepository.save(Placeholder.builder().name("{{지점주소}}").comment("지점 주소").examples("서울시 강남구").value("{branch.address}").build());
        placeholderRepository.save(Placeholder.builder().name("{{담당자}}").comment("지점 담당자 이름").examples("홍길동").value("{branch.manager}").build());
        placeholderRepository.save(Placeholder.builder().name("{{오시는길}}").comment("지점 오시는 길 안내").examples("2호선 강남역 3번 출구 도보 5분").value("{branch.directions}").build());

        log.info("초기 플레이스홀더 11건 생성 완료");
    }

    private void initStaffMembership() {
        if (membershipRepository.findByName("스태프 무제한").isPresent()) return;

        membershipRepository.save(Membership.builder()
                .name("스태프 무제한")
                .duration(36500)
                .count(999999)
                .price(0)
                .isInternal(true)
                .build());
        log.info("스태프 전용 내부 멤버십 생성: 스태프 무제한");
    }
}
