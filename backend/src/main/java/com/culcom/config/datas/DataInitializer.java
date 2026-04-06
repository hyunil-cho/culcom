package com.culcom.config.datas;

import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.*;
import com.culcom.entity.complex.staff.ComplexStaff;
import com.culcom.entity.complex.staff.ComplexStaffAttendance;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.AttendanceStatus;
import com.culcom.entity.enums.StaffAttendanceStatus;
import com.culcom.entity.enums.UserRole;
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
}
