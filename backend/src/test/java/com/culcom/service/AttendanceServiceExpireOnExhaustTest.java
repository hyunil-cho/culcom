package com.culcom.service;

import com.culcom.dto.complex.attendance.BulkAttendanceRequest;
import com.culcom.dto.complex.attendance.BulkAttendanceResultResponse;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.product.Membership;
import com.culcom.entity.complex.member.logs.MemberActivityLog;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.MemberActivityLogRepository;
import com.culcom.repository.MembershipRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 데이터 무결성 시나리오:
 * 출석 처리로 인해 멤버십 사용 횟수가 totalCount에 도달하면(소진),
 * ComplexMemberMembership 의 status 가 자동으로 활성 → 만료 로 전환되어야 한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceServiceExpireOnExhaustTest {

    @Autowired AttendanceService attendanceService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired MemberActivityLogRepository memberActivityLogRepository;

    @Test
    void 마지막_출석으로_횟수_소진되면_상태가_만료로_전환된다() {
        // given — totalCount=3, usedCount=2 → 한 번만 더 사용하면 소진
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-expire-" + System.nanoTime())
                .build());

        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금").daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());

        ComplexClass clazz = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("요가A").capacity(10).sortOrder(0)
                .build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("3회권").duration(30).count(3).price(60000).build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("심청").phoneNumber("01055556666").branch(branch).build());

        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusDays(30))
                .totalCount(3)
                .usedCount(2)
                .status(MembershipStatus.활성)
                .build());

        // sanity
        assertThat(mm.getStatus()).isEqualTo(MembershipStatus.활성);

        BulkAttendanceRequest.BulkMember bm = new BulkAttendanceRequest.BulkMember();
        bm.setMemberSeq(member.getSeq());
        bm.setAttended(true);
        BulkAttendanceRequest req = new BulkAttendanceRequest();
        req.setClassSeq(clazz.getSeq());
        req.setMembers(List.of(bm));

        // when
        // 1) 셋업 트랜잭션을 commit하여 이후 서비스 호출이 저장된 데이터를 보게 한다
        Long memberSeq = member.getSeq();
        Long mmSeq = mm.getSeq();
        TestTransaction.flagForCommit();
        TestTransaction.end();

        // 2) 서비스를 자체 트랜잭션에서 호출 → 내부 commit 시점에 BEFORE_COMMIT 리스너가 활동 로그를 저장
        List<BulkAttendanceResultResponse> results = attendanceService.processBulkAttendance(req);

        // then — 출석 정상 처리 + 횟수 소진 + 상태 자동 만료
        assertThat(results.get(0).getStatus()).isEqualTo("출석");

        // 3) 검증용 새 트랜잭션 시작
        TestTransaction.start();
        TestTransaction.flagForRollback();

        ComplexMemberMembership reloaded = memberMembershipRepository.findById(mmSeq).orElseThrow();
        assertThat(reloaded.getUsedCount())
                .as("마지막 출석으로 totalCount에 도달")
                .isEqualTo(3);
        assertThat(reloaded.getStatus())
                .as("횟수 소진 시 status가 자동으로 만료로 전환되어야 한다")
                .isEqualTo(MembershipStatus.만료);

        // 회원 활동 히스토리에 만료 이벤트가 남았는지 검증
        List<MemberActivityLog> logs = memberActivityLogRepository
                .findByMemberSeqOrderByCreatedDateDesc(memberSeq);

        assertThat(logs)
                .as("멤버십 만료 이벤트가 최소 1건 활동 히스토리에 기록되어야 한다")
                .anySatisfy(log -> {
                    assertThat(log.getEventType()).isEqualTo(ActivityEventType.MEMBERSHIP_UPDATE);
                    assertThat(log.getMemberMembershipSeq()).isEqualTo(mmSeq);
                    assertThat(log.getNote())
                            .as("만료 사유 노트에 '소진' 키워드가 포함되어야 한다")
                            .contains("소진");
                });

        // 데이터는 nanoTime 접미사로 고유 — 다음 테스트와 충돌 없음, 별도 정리 불요
    }

    @Test
    void 횟수가_남아있을_때는_상태가_활성으로_유지된다() {
        // given — totalCount=5, usedCount=2 → 출석 후에도 여유 있음
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-expire-keep-" + System.nanoTime())
                .build());

        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("화목").daysOfWeek("TUE,THU")
                .startTime(LocalTime.of(19, 0)).endTime(LocalTime.of(20, 0))
                .build());

        ComplexClass clazz = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("필라테스").capacity(10).sortOrder(0)
                .build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("5회권").duration(30).count(5).price(100000).build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("흥부").phoneNumber("01077778888").branch(branch).build());

        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusDays(30))
                .totalCount(5)
                .usedCount(2)
                .status(MembershipStatus.활성)
                .build());

        BulkAttendanceRequest.BulkMember bm = new BulkAttendanceRequest.BulkMember();
        bm.setMemberSeq(member.getSeq());
        bm.setAttended(true);
        BulkAttendanceRequest req = new BulkAttendanceRequest();
        req.setClassSeq(clazz.getSeq());
        req.setMembers(List.of(bm));

        // when
        attendanceService.processBulkAttendance(req);

        // then — usedCount는 +1, status는 그대로 활성
        ComplexMemberMembership reloaded = memberMembershipRepository.findById(mm.getSeq()).orElseThrow();
        assertThat(reloaded.getUsedCount()).isEqualTo(3);
        assertThat(reloaded.getStatus())
                .as("아직 횟수가 남아있으면 status는 활성으로 유지")
                .isEqualTo(MembershipStatus.활성);
    }
}
