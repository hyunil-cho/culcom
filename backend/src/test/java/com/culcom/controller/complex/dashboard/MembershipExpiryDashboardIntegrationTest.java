package com.culcom.controller.complex.dashboard;

import com.culcom.dto.complex.attendance.BulkAttendanceRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.track.MemberActivityLog;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.product.Membership;
import com.culcom.repository.*;
import com.culcom.service.AttendanceService;
import com.culcom.service.MembershipExpiryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 대시보드 멤버십 만료 알림 통합 테스트.
 *
 * 시나리오 1 — 출석으로 횟수 소진 → 당일: autoExpiredToday 에 노출
 * 시나리오 2 — 기간 만료 스케줄러 실행 전/후 → 실행 전: recentlyExpired(이미 만료), 실행 후: autoExpiredToday(오늘 자동 만료)
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MembershipExpiryDashboardIntegrationTest {

    @Autowired AttendanceService attendanceService;
    @Autowired MembershipExpiryService membershipExpiryService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired MemberActivityLogRepository memberActivityLogRepository;

    /**
     * 출석 처리로 횟수가 소진되면,
     * 당일 대시보드 조회 시 '오늘 자동 만료(autoExpiredToday)'에 해당 회원이 노출된다.
     */
    @Test
    void 출석으로_횟수_소진되면_오늘_자동_만료에_노출된다() {
        // given — totalCount=3, usedCount=2 → 한 번 더 출석하면 소진
        long uniq = System.nanoTime();
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("대시보드테스트지점-" + uniq)
                .alias("dash-expire-" + uniq)
                .build());

        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금").daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());

        ComplexClass clazz = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("요가B").capacity(10).sortOrder(0)
                .build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("3회권-대시보드").duration(30).count(3).price(60000).build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("홍길동").phoneNumber("01011112222").branch(branch).build());

        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusDays(30))
                .totalCount(3).usedCount(2)
                .status(MembershipStatus.활성)
                .build());

        Long branchSeq = branch.getSeq();
        Long memberSeq = member.getSeq();
        Long mmSeq = mm.getSeq();

        // 셋업 커밋 — 서비스가 저장된 데이터를 볼 수 있도록
        TestTransaction.flagForCommit();
        TestTransaction.end();

        // when — 마지막 출석 → 횟수 소진 → 자동 만료
        BulkAttendanceRequest.BulkMember bm = new BulkAttendanceRequest.BulkMember();
        bm.setMemberSeq(memberSeq);
        bm.setAttended(true);
        BulkAttendanceRequest req = new BulkAttendanceRequest();
        req.setClassSeq(clazz.getSeq());
        req.setMembers(List.of(bm));

        attendanceService.processBulkAttendance(req);

        // then — '오늘 자동 만료' 대시보드 쿼리에 잡혀야 한다
        TestTransaction.start();
        TestTransaction.flagForRollback();

        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime startOfTomorrow = today.plusDays(1).atStartOfDay();

        List<MemberActivityLog> autoExpiredToday = memberActivityLogRepository
                .findAutoExpiredBetween(branchSeq, startOfDay, startOfTomorrow);

        assertThat(autoExpiredToday)
                .as("출석으로 횟수 소진된 멤버십이 '오늘 자동 만료' 목록에 있어야 한다")
                .anyMatch(log ->
                        log.getMember().getSeq().equals(memberSeq)
                        && log.getMemberMembershipSeq().equals(mmSeq)
                        && log.getNote().contains("소진"));

        // 멤버십 status도 만료로 전환 확인
        ComplexMemberMembership reloaded = memberMembershipRepository.findById(mmSeq).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(MembershipStatus.만료);
    }

    /**
     * 기간 만료 시나리오:
     *  - 만료일이 어제인 멤버십(status=활성) → 스케줄러 실행 전에는 'recentlyExpired(이미 만료)'에 노출
     *  - 스케줄러 실행 → status가 만료로 전환 → 'autoExpiredToday(오늘 자동 만료)'에 노출
     *  - 'recentlyExpired'에서는 사라짐 (status가 더 이상 활성이 아니므로)
     */
    @Test
    void 기간만료_스케줄러_실행_전에는_이미만료_실행_후에는_오늘_자동만료에_노출된다() {
        // given — 만료일이 어제인 활성 멤버십
        long uniq = System.nanoTime();
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("기간만료테스트-" + uniq)
                .alias("dash-date-expire-" + uniq)
                .build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("월간권-기간만료").duration(30).count(999).price(100000).build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("이순신").phoneNumber("01033334444").branch(branch).build());

        LocalDate yesterday = LocalDate.now().minusDays(1);

        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(yesterday.minusDays(30))
                .expiryDate(yesterday)
                .totalCount(999).usedCount(5)
                .status(MembershipStatus.활성)
                .build());

        Long branchSeq = branch.getSeq();
        Long memberSeq = member.getSeq();
        Long mmSeq = mm.getSeq();

        // 셋업 커밋
        TestTransaction.flagForCommit();
        TestTransaction.end();

        // ── 스케줄러 실행 전: recentlyExpired(이미 만료)에 노출 ──
        TestTransaction.start();

        LocalDate today = LocalDate.now();
        LocalDate since = today.minusDays(14);

        List<ComplexMemberMembership> recentlyExpiredBefore = memberMembershipRepository
                .findRecentlyExpired(branchSeq, today, since);

        assertThat(recentlyExpiredBefore)
                .as("스케줄러 실행 전, status=활성이지만 만료일이 지난 멤버십이 '이미 만료' 목록에 있어야 한다")
                .anyMatch(m -> m.getSeq().equals(mmSeq));

        // autoExpiredToday에는 아직 없어야 함
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime startOfTomorrow = today.plusDays(1).atStartOfDay();

        List<MemberActivityLog> autoExpiredBefore = memberActivityLogRepository
                .findAutoExpiredBetween(branchSeq, startOfDay, startOfTomorrow);

        assertThat(autoExpiredBefore)
                .as("스케줄러 실행 전에는 '오늘 자동 만료'에 해당 멤버십이 없어야 한다")
                .noneMatch(log -> log.getMemberMembershipSeq().equals(mmSeq));

        TestTransaction.flagForCommit();
        TestTransaction.end();

        // ── 스케줄러 실행 (기간 만료 자동 처리) ──
        int expiredCount = membershipExpiryService.expirePastDueOn(today);
        assertThat(expiredCount).as("만료 처리 건수").isGreaterThanOrEqualTo(1);

        // ── 스케줄러 실행 후: autoExpiredToday(오늘 자동 만료)에 노출 ──
        TestTransaction.start();
        TestTransaction.flagForRollback();

        List<MemberActivityLog> autoExpiredAfter = memberActivityLogRepository
                .findAutoExpiredBetween(branchSeq, startOfDay, startOfTomorrow);

        assertThat(autoExpiredAfter)
                .as("스케줄러 실행 후, '오늘 자동 만료' 목록에 기간 만료된 멤버십이 있어야 한다")
                .anyMatch(log ->
                        log.getMember().getSeq().equals(memberSeq)
                        && log.getMemberMembershipSeq().equals(mmSeq)
                        && log.getNote().contains("기간 만료"));

        // recentlyExpired에서는 사라져야 함 (status가 만료로 바뀌었으므로)
        List<ComplexMemberMembership> recentlyExpiredAfter = memberMembershipRepository
                .findRecentlyExpired(branchSeq, today, since);

        assertThat(recentlyExpiredAfter)
                .as("스케줄러 실행 후, status=만료이므로 '이미 만료' 목록에서 사라져야 한다")
                .noneMatch(m -> m.getSeq().equals(mmSeq));

        // 멤버십 status 확인
        ComplexMemberMembership reloaded = memberMembershipRepository.findById(mmSeq).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(MembershipStatus.만료);
    }
}
