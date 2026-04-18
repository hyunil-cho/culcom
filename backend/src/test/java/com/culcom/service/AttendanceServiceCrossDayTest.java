package com.culcom.service;

import com.culcom.dto.complex.attendance.BulkAttendanceRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberAttendance;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.AttendanceStatus;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.product.Membership;
import com.culcom.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cross-day 시나리오: 어제 출석 기록이 있는 회원을 오늘 다시 출석/결석 체크하면
 *  - 어제 기록의 상태는 바뀌지 않고 그대로 보존된다.
 *  - 오늘 날짜로 신규 기록이 생성된다.
 *  - usedCount 는 오늘 기록 기준으로 추가 1회 차감된다. (하루치 사용)
 *
 * 즉, "같은 날 토글만 중복 차감이 없다" 는 규칙은 오늘의 기록에만 적용된다.
 * 서비스 내부에서 existingAttendance 조회가 LocalDate.now() 로 고정되어 있어서,
 * 어제 기록은 조회 대상에서 빠지고 신규로 간주된다 — 의도된 동작이며 이 테스트가 이를 문서화한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceServiceCrossDayTest {

    @Autowired AttendanceService attendanceService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexMemberAttendanceRepository attendanceRepository;

    @PersistenceContext EntityManager em;

    private record Fixture(ComplexClass clazz, ComplexMember member, ComplexMemberMembership mm) {}

    private Fixture bootstrap(String suffix, int totalCount, int initialUsed) {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-crossday-" + suffix + "-" + System.nanoTime())
                .build());
        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금").daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());
        ComplexClass clazz = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("요가A").capacity(10).sortOrder(0)
                .build());
        Membership product = membershipRepository.save(Membership.builder()
                .name(totalCount + "회권").duration(60).count(totalCount).price(150000).build());
        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("테스터-" + suffix).phoneNumber("010" + (System.nanoTime() % 100000000L))
                .branch(branch).build());
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now().minusDays(10)).expiryDate(LocalDate.now().plusDays(60))
                .totalCount(totalCount).usedCount(initialUsed)
                .status(MembershipStatus.활성)
                .build());
        return new Fixture(clazz, member, mm);
    }

    /**
     * 어제 날짜의 출석 기록을 직접 삽입해 "이미 어제 +1 차감된" 상태를 시뮬레이션한다.
     * 서비스를 통하면 LocalDate.now() 로만 기록되므로 테스트에서만 이렇게 주입한다.
     */
    private void seedYesterday(Fixture f, AttendanceStatus status, int usedCountAfterYesterday) {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        f.mm().setUsedCount(usedCountAfterYesterday);
        memberMembershipRepository.save(f.mm());
        attendanceRepository.save(ComplexMemberAttendance.builder()
                .member(f.member()).complexClass(f.clazz())
                .memberMembership(f.mm())
                .attendanceDate(yesterday)
                .status(status)
                .build());
        em.flush();
        em.clear();
    }

    private void submitToday(Fixture f, boolean attended) {
        BulkAttendanceRequest.BulkMember bm = new BulkAttendanceRequest.BulkMember();
        bm.setMemberSeq(f.member().getSeq());
        bm.setAttended(attended);
        BulkAttendanceRequest req = new BulkAttendanceRequest();
        req.setClassSeq(f.clazz().getSeq());
        req.setMembers(List.of(bm));
        attendanceService.processBulkAttendance(req);
        em.flush();
        em.clear();
    }

    @Test
    @DisplayName("어제 출석 후 오늘 다시 출석 체크하면 usedCount 는 어제(+1) 오늘(+1) 합쳐 2회 차감된다")
    void 어제_출석_오늘_출석_각각_차감() {
        // given — 시작 4, 어제 한 번 출석되어 5 인 상태
        Fixture f = bootstrap("same-present", 10, 4);
        seedYesterday(f, AttendanceStatus.출석, 5);

        // when — 오늘 출석 체크
        submitToday(f, true);

        // then — usedCount 는 6 (어제1 + 오늘1)
        ComplexMemberMembership reloaded =
                memberMembershipRepository.findById(f.mm().getSeq()).orElseThrow();
        assertThat(reloaded.getUsedCount())
                .as("어제/오늘 각각 하루치 사용이 반영되어야 한다").isEqualTo(6);

        // 어제 기록과 오늘 기록이 각각 존재한다
        assertThat(attendanceRepository.findByClassAndDate(f.clazz().getSeq(), LocalDate.now().minusDays(1)))
                .hasSize(1);
        assertThat(attendanceRepository.findByClassAndDate(f.clazz().getSeq(), LocalDate.now()))
                .hasSize(1);
    }

    @Test
    @DisplayName("어제 출석 → 오늘 결석으로 체크해도 어제 기록은 '출석' 상태 그대로 보존된다")
    void 어제_기록은_오늘_변경에_영향받지_않는다() {
        // given — 어제 출석, usedCount 5
        Fixture f = bootstrap("preserve", 10, 4);
        seedYesterday(f, AttendanceStatus.출석, 5);

        // when — 오늘은 결석으로 체크
        submitToday(f, false);

        // then — 어제 기록은 여전히 출석, 오늘 기록은 결석
        Optional<ComplexMemberAttendance> yesterdayRecord =
                attendanceRepository.findByMemberAndClassAndDate(
                        f.member().getSeq(), f.clazz().getSeq(), LocalDate.now().minusDays(1));
        assertThat(yesterdayRecord).isPresent();
        assertThat(yesterdayRecord.get().getStatus())
                .as("어제 기록은 오늘의 입력에 영향받으면 안 된다")
                .isEqualTo(AttendanceStatus.출석);

        Optional<ComplexMemberAttendance> todayRecord =
                attendanceRepository.findByMemberAndClassAndDate(
                        f.member().getSeq(), f.clazz().getSeq(), LocalDate.now());
        assertThat(todayRecord).isPresent();
        assertThat(todayRecord.get().getStatus()).isEqualTo(AttendanceStatus.결석);

        // 그리고 usedCount 는 어제1 + 오늘1 = 6 (결석이든 출석이든 차감은 동일)
        ComplexMemberMembership reloaded =
                memberMembershipRepository.findById(f.mm().getSeq()).orElseThrow();
        assertThat(reloaded.getUsedCount()).isEqualTo(6);
    }

    @Test
    @DisplayName("경계 케이스: 오늘 첫 체크 후 당일 내 토글 → 1회만 차감, 다음 날 체크 → 추가 1회 차감")
    void 당일_토글과_차일_체크_혼합() {
        // 시작: usedCount 4
        Fixture f = bootstrap("mixed", 10, 4);

        // 어제 출석 (usedCount 5)
        seedYesterday(f, AttendanceStatus.출석, 5);

        // 오늘 출석 (+1 → 6), 이후 같은 날 결석으로 토글 (차감 없음, 상태만 변경)
        submitToday(f, true);
        submitToday(f, false);

        ComplexMemberMembership reloaded =
                memberMembershipRepository.findById(f.mm().getSeq()).orElseThrow();
        assertThat(reloaded.getUsedCount())
                .as("어제 +1, 오늘 최초 +1, 같은 날 토글은 미차감 → 총 6")
                .isEqualTo(6);

        // 오늘 기록은 결석 상태 1건
        Optional<ComplexMemberAttendance> todayRecord =
                attendanceRepository.findByMemberAndClassAndDate(
                        f.member().getSeq(), f.clazz().getSeq(), LocalDate.now());
        assertThat(todayRecord).isPresent();
        assertThat(todayRecord.get().getStatus()).isEqualTo(AttendanceStatus.결석);
    }
}
