package com.culcom.config;

import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.branch.BranchThirdPartyMapping;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.integration.ExternalServiceType;
import com.culcom.entity.integration.ThirdPartyService;
import com.culcom.entity.message.MessageTemplate;
import com.culcom.entity.message.Placeholder;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Profile("local")
@RequiredArgsConstructor
public class LocalDataInitializer implements ApplicationRunner {

    private final UserInfoRepository userInfoRepository;
    private final BranchRepository branchRepository;
    private final ExternalServiceTypeRepository externalServiceTypeRepository;
    private final ThirdPartyServiceRepository thirdPartyServiceRepository;
    private final BranchThirdPartyMappingRepository mappingRepository;
    private final PlaceholderRepository placeholderRepository;
    private final MessageTemplateRepository messageTemplateRepository;
    private final CustomerRepository customerRepository;
    private final ClassTimeSlotRepository classTimeSlotRepository;
    private final ComplexClassRepository complexClassRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (userInfoRepository.findByUserId("root").isEmpty()) {
            UserInfo root = UserInfo.builder()
                    .userId("root")
                    .userPassword("root")
                    .role(UserRole.ROOT)
                    .build();
            userInfoRepository.save(root);
            log.info("초기 계정 생성: root/root (ROOT)");
        }

        if (userInfoRepository.findByUserId("user").isEmpty()) {
            UserInfo manager = UserInfo.builder()
                    .userId("user")
                    .userPassword("user")
                    .role(UserRole.BRANCH_MANAGER)
                    .name("조현일")
                    .phone("01099321967")
                    .build();
            userInfoRepository.save(manager);
            log.info("초기 계정 생성: user/user (BRANCH_MANAGER, 조현일)");

            if (branchRepository.findByAlias("gangnam").isEmpty()) {
                Branch branch = Branch.builder()
                        .branchName("강남점")
                        .alias("gangnam")
                        .branchManager("조현일")
                        .address("서울특별시 강남구 테헤란로 123")
                        .createdBy(manager)
                        .build();
                branchRepository.save(branch);
                log.info("초기 지점 생성: 강남점 (생성자: user)");
            }
        }

        initThirdPartyServices();
        initPlaceholders();
        initSampleData();
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

        // 강남점에 마이문자 매핑 생성
        branchRepository.findByAlias("gangnam").ifPresent(branch -> {
            if (mappingRepository.findByBranchSeqAndThirdPartyServiceSeq(
                    branch.getSeq(), mymunja.getSeq()).isEmpty()) {
                BranchThirdPartyMapping mapping = BranchThirdPartyMapping.builder()
                        .branch(branch)
                        .thirdPartyService(mymunja)
                        .isActive(false)
                        .build();
                mappingRepository.save(mapping);
                log.info("초기 매핑 생성: 강남점 - 마이문자");
            }
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

    private void initSampleData() {
        branchRepository.findByAlias("gangnam").ifPresent(branch -> {
            // 샘플 메시지 템플릿
            if (messageTemplateRepository.findByBranchSeqOrderByIsDefaultDescLastUpdateDateDesc(branch.getSeq()).isEmpty()) {
                messageTemplateRepository.save(MessageTemplate.builder()
                        .branch(branch)
                        .templateName("예약 확인 안내")
                        .description("예약 확정 시 고객에게 보내는 안내 메시지")
                        .messageContext("안녕하세요 {{고객명}}님, {{지점명}}입니다.\n{{예약일자}}에 예약이 확정되었습니다.\n주소: {{지점주소}}\n오시는 길: {{오시는길}}\n감사합니다.")
                        .isDefault(true)
                        .isActive(true)
                        .build());

                messageTemplateRepository.save(MessageTemplate.builder()
                        .branch(branch)
                        .templateName("방문 안내")
                        .description("첫 방문 고객에게 보내는 안내 메시지")
                        .messageContext("{{고객명}}님 안녕하세요.\n{{지점명}}에 관심을 가져주셔서 감사합니다.\n궁금하신 점은 담당자 {{담당자}}에게 연락 주세요.\n감사합니다.")
                        .isActive(true)
                        .build());

                log.info("초기 메시지 템플릿 2건 생성 완료");
            }

            // 샘플 고객
            if (customerRepository.findByBranchSeq(branch.getSeq(), org.springframework.data.domain.PageRequest.of(0, 1)).isEmpty()) {
                customerRepository.save(Customer.builder()
                        .branch(branch)
                        .name("홍길동")
                        .phoneNumber("01099321967")
                        .commercialName("네이버 광고")
                        .adSource("블로그")
                        .build());

                customerRepository.save(Customer.builder()
                        .branch(branch)
                        .name("김철수")
                        .phoneNumber("01012345678")
                        .commercialName("인스타그램")
                        .adSource("SNS")
                        .build());

                customerRepository.save(Customer.builder()
                        .branch(branch)
                        .name("이영희")
                        .phoneNumber("01098765432")
                        .commercialName("카카오 광고")
                        .adSource("검색")
                        .build());

                log.info("초기 샘플 고객 3건 생성 완료");
            }

            // 샘플 시간대 + 수업
            if (classTimeSlotRepository.findByBranchSeq(branch.getSeq()).isEmpty()) {
                ClassTimeSlot timeSlot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                        .branch(branch)
                        .name("평일 오전반")
                        .daysOfWeek("월,수,금")
                        .startTime(java.time.LocalTime.of(10, 0))
                        .endTime(java.time.LocalTime.of(11, 30))
                        .build());
                log.info("초기 시간대 생성: 평일 오전반");

                complexClassRepository.save(ComplexClass.builder()
                        .branch(branch)
                        .timeSlot(timeSlot)
                        .name("기초 영어회화")
                        .description("왕초보를 위한 기초 영어회화 수업")
                        .capacity(15)
                        .sortOrder(1)
                        .build());
                log.info("초기 수업 생성: 기초 영어회화 (시간대: 평일 오전반)");
            }
        });
    }
}
