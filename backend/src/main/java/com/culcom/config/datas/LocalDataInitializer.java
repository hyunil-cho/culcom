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
import com.culcom.entity.integration.ExternalServiceType;
import com.culcom.entity.integration.ThirdPartyService;
import com.culcom.entity.message.MessageTemplate;
import com.culcom.entity.message.Placeholder;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@Profile({"test"})
@DependsOn("dataInitializer")
@RequiredArgsConstructor
public class LocalDataInitializer implements ApplicationRunner {

    private final UserInfoRepository userInfoRepository;
    private final BranchRepository branchRepository;
    private final MessageTemplateRepository messageTemplateRepository;
    private final CustomerRepository customerRepository;
    private final ClassTimeSlotRepository classTimeSlotRepository;
    private final ComplexClassRepository complexClassRepository;
    private final ComplexMemberRepository complexMemberRepository;
    private final ComplexStaffRepository complexStaffRepository;
    private final MembershipRepository membershipRepository;
    private final ComplexMemberMembershipRepository complexMemberMembershipRepository;
    private final ComplexMemberClassMappingRepository complexMemberClassMappingRepository;
    private final ComplexMemberAttendanceRepository complexMemberAttendanceRepository;
    private final ComplexStaffAttendanceRepository complexStaffAttendanceRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        if (userInfoRepository.findByUserId("user").isEmpty()) {
            UserInfo manager = UserInfo.builder()
                    .userId("user")
                    .userPassword(passwordEncoder.encode("user"))
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
        initSampleData();
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

                ComplexClass clazz = complexClassRepository.save(ComplexClass.builder()
                        .branch(branch)
                        .timeSlot(timeSlot)
                        .name("기초 영어회화")
                        .description("왕초보를 위한 기초 영어회화 수업")
                        .capacity(15)
                        .sortOrder(1)
                        .build());
                log.info("초기 수업 생성: 기초 영어회화 (시간대: 평일 오전반)");

                initAttendanceSampleData(branch, clazz);
            }
        });
    }

    private void initAttendanceSampleData(Branch branch, ComplexClass clazz) {
        // 멤버십 상품
        Membership membership = membershipRepository.save(Membership.builder()
                .name("3개월 정규반")
                .duration(90)
                .count(36)
                .price(300000)
                .build());

        // 회원 3명
        ComplexMember member1 = complexMemberRepository.save(ComplexMember.builder()
                .branch(branch).name("박지민").phoneNumber("01011112222")
                .level("중급").signupChannel("블로그").interviewer("조현일").build());
        ComplexMember member2 = complexMemberRepository.save(ComplexMember.builder()
                .branch(branch).name("최수현").phoneNumber("01033334444")
                .level("초급").signupChannel("지인소개").interviewer("조현일").build());
        ComplexMember member3 = complexMemberRepository.save(ComplexMember.builder()
                .branch(branch).name("김태영").phoneNumber("01055556666")
                .level("고급").signupChannel("인스타그램").interviewer("조현일").build());

        // 스태프 1명
        ComplexStaff staff = complexStaffRepository.save(ComplexStaff.builder()
                .branch(branch).name("이민호").phoneNumber("01077778888")
                .email("minho@culcom.com").subject("영어").build());

        // 멤버십 등록
        LocalDate today = LocalDate.now();
        ComplexMemberMembership mm1 = complexMemberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member1).membership(membership)
                .startDate(today.minusDays(60)).expiryDate(today.plusDays(30))
                .totalCount(36).usedCount(20).build());
        ComplexMemberMembership mm2 = complexMemberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member2).membership(membership)
                .startDate(today.minusDays(45)).expiryDate(today.plusDays(45))
                .totalCount(36).usedCount(15).build());
        ComplexMemberMembership mm3 = complexMemberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member3).membership(membership)
                .startDate(today.minusDays(30)).expiryDate(today.plusDays(60))
                .totalCount(36).usedCount(10).build());

        // 수업-회원 매핑
        complexMemberClassMappingRepository.save(ComplexMemberClassMapping.builder().member(member1).complexClass(clazz).build());
        complexMemberClassMappingRepository.save(ComplexMemberClassMapping.builder().member(member2).complexClass(clazz).build());
        complexMemberClassMappingRepository.save(ComplexMemberClassMapping.builder().member(member3).complexClass(clazz).build());

        // 회원 출석 기록 생성 (최근 30일)
        AttendanceStatus[] memberStatuses = { AttendanceStatus.출석, AttendanceStatus.결석, AttendanceStatus.연기 };
        ComplexMemberMembership[] memberships = { mm1, mm2, mm3 };
        String[] notes = { null, "체조 부상", null, "개인 사정", null, null, "교통 지연", null, null, null };

        for (int m = 0; m < memberships.length; m++) {
            for (int d = 1; d <= 25; d++) {
                // 주말 건너뛰기 (월수금 수업)
                LocalDate date = today.minusDays(d);
                int dow = date.getDayOfWeek().getValue();
                if (dow == 6 || dow == 7) continue;

                // 회원별로 다른 출석 패턴
                AttendanceStatus status;
                if (m == 0) {
                    status = (d % 7 == 0) ? AttendanceStatus.결석 : (d % 5 == 0) ? AttendanceStatus.연기 : AttendanceStatus.출석;
                } else if (m == 1) {
                    status = (d % 4 == 0) ? AttendanceStatus.결석 : (d % 6 == 0) ? AttendanceStatus.연기 : AttendanceStatus.출석;
                } else {
                    status = (d % 3 == 0) ? AttendanceStatus.결석 : (d % 8 == 0) ? AttendanceStatus.연기 : AttendanceStatus.출석;
                }

                complexMemberAttendanceRepository.save(ComplexMemberAttendance.builder()
                        .memberMembership(memberships[m])
                        .complexClass(clazz)
                        .attendanceDate(date)
                        .status(status)
                        .note(notes[(d + m) % notes.length])
                        .build());
            }
        }

        // 스태프 출석 기록 (최근 30일)
        for (int d = 1; d <= 25; d++) {
            LocalDate date = today.minusDays(d);
            int dow = date.getDayOfWeek().getValue();
            if (dow == 6 || dow == 7) continue;

            StaffAttendanceStatus status = (d % 10 == 0) ? StaffAttendanceStatus.결석 : StaffAttendanceStatus.출석;
            complexStaffAttendanceRepository.save(ComplexStaffAttendance.builder()
                    .staff(staff).complexClass(clazz)
                    .attendanceDate(date).status(status).build());
        }

        log.info("초기 출석 샘플 데이터 생성 완료 (회원 3명, 스태프 1명, 약 25일치)");
    }
}
