package com.culcom.service;

import com.culcom.dto.calendar.CalendarReservationResponse;
import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.entity.enums.UserRole;
import com.culcom.entity.reservation.ReservationInfo;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.CustomerRepository;
import com.culcom.repository.ReservationInfoRepository;
import com.culcom.repository.UserInfoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 예약 일시(interviewDate) 변경 동작 검증.
 * - CalendarService.updateReservationDate 가 interviewDate 만 변경하고 다른 필드는 보존하는지
 * - DashboardMapper.selectCallerStats 가 interview_date 가 아닌 created_date 기준이라
 *   예약 일시 변경이 caller 실적 집계에 영향을 주지 않음을 매퍼 XML 정적 검사로 잠금 (회귀 방지)
 *
 * 참고: 실제 SQL 실행 검증은 H2 가 MySQL 모드에서도 DATE_SUB 함수를 미지원하여 제외.
 *       대신 매퍼 XML 의 reservation 집계 필터 컬럼을 직접 검증한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CalendarServiceReservationDateTest {

    @Autowired CalendarService calendarService;
    @Autowired BranchRepository branchRepository;
    @Autowired CustomerRepository customerRepository;
    @Autowired ReservationInfoRepository reservationInfoRepository;
    @Autowired UserInfoRepository userInfoRepository;

    private Branch branch;
    private UserInfo user;
    private Customer customer;
    private ReservationInfo reservation;

    private static final String CALLER = "P";

    @BeforeEach
    void setUp() {
        long nano = System.nanoTime();
        branch = branchRepository.save(Branch.builder()
                .branchName("지점_" + nano)
                .alias("a_" + nano)
                .build());

        user = userInfoRepository.save(UserInfo.builder()
                .userId("u_" + nano)
                .userPassword("x")
                .role(UserRole.BRANCH_MANAGER)
                .requirePasswordChange(false)
                .build());

        customer = customerRepository.save(Customer.builder()
                .branch(branch)
                .name("홍길동_" + nano)
                .phoneNumber("010" + (nano % 100000000))
                .status(CustomerStatus.예약확정)
                .build());

        reservation = reservationInfoRepository.save(ReservationInfo.builder()
                .branch(branch)
                .caller(CALLER)
                .interviewDate(LocalDateTime.of(2026, 4, 26, 14, 30))
                .user(user)
                .customer(customer)
                .build());
    }

    @Test
    @DisplayName("interviewDate 만 변경되고 caller/status/customer 등 다른 필드는 보존된다")
    void updateReservationDate_only_changes_interviewDate() {
        LocalDateTime newDate = LocalDateTime.of(2099, 1, 15, 9, 0);

        CalendarReservationResponse res = calendarService.updateReservationDate(reservation.getSeq(), newDate);

        ReservationInfo reloaded = reservationInfoRepository.findById(reservation.getSeq()).orElseThrow();
        assertThat(reloaded.getInterviewDate()).isEqualTo(newDate);
        assertThat(reloaded.getCaller()).isEqualTo(CALLER);
        assertThat(reloaded.getCustomer().getSeq()).isEqualTo(customer.getSeq());
        assertThat(reloaded.getCustomer().getStatus()).isEqualTo(CustomerStatus.예약확정);
        assertThat(reloaded.getUser().getSeq()).isEqualTo(user.getSeq());

        assertThat(res.getCaller()).isEqualTo(CALLER);
        assertThat(res.getStatus()).isEqualTo(CustomerStatus.예약확정.name());
    }

    @Test
    @DisplayName("caller-stats SQL 의 reservation 필터는 created_date 기반이어야 한다 (interview_date 변경 영향 차단)")
    void callerStats_reservation_filter_is_based_on_createdDate() throws Exception {
        String mapperXml = Files.readString(
                Path.of("src/main/resources/mapper/DashboardMapper.xml"));

        // reservationDateCondition fragment 만 추출
        int start = mapperXml.indexOf("<sql id=\"reservationDateCondition\">");
        int end = mapperXml.indexOf("</sql>", start);
        assertThat(start).as("reservationDateCondition fragment 존재").isGreaterThanOrEqualTo(0);
        String fragment = mapperXml.substring(start, end);

        assertThat(fragment)
                .as("interview_date 가 아닌 created_date 기반이어야 함")
                .contains("r.created_date")
                .doesNotContain("interview_date");
    }
}
