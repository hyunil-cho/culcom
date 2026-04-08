package com.culcom.service;

import com.culcom.dto.complex.attendance.BulkAttendanceRequest;
import com.culcom.dto.complex.attendance.BulkAttendanceResultResponse;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.product.Membership;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.MembershipRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 데이터 무결성 시나리오:
 * 결석(attended=false) 처리도 "수업이 진행됐다는 사실 자체"로 간주되어
 * 멤버십의 usedCount가 1만큼 차감(증가)되어야 한다.
 * 즉, 결석이라고 해서 사용 횟수가 보존되지 않는다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceServiceAbsentConsumeTest {

    @Autowired AttendanceService attendanceService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;

    @Test
    void 결석_처리해도_usedCount는_1_증가한다() {
        // given — totalCount=10, usedCount=4
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-absent-" + System.nanoTime())
                .build());

        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금").daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());

        ComplexClass clazz = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("요가A").capacity(10).sortOrder(0)
                .build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("10회권").duration(60).count(10).price(150000).build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("논개").phoneNumber("01022223333").branch(branch).build());

        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusDays(60))
                .totalCount(10)
                .usedCount(4)
                .status(MembershipStatus.활성)
                .build());

        // attended=false → 결석
        BulkAttendanceRequest.BulkMember bm = new BulkAttendanceRequest.BulkMember();
        bm.setMemberSeq(member.getSeq());
        bm.setAttended(false);
        BulkAttendanceRequest req = new BulkAttendanceRequest();
        req.setClassSeq(clazz.getSeq());
        req.setMembers(List.of(bm));

        // when
        List<BulkAttendanceResultResponse> results = attendanceService.processBulkAttendance(req);

        // then — 결석으로 기록되었지만 usedCount는 +1
        assertThat(results.get(0).getStatus()).isEqualTo("결석");

        ComplexMemberMembership reloaded = memberMembershipRepository.findById(mm.getSeq()).orElseThrow();
        assertThat(reloaded.getUsedCount())
                .as("결석이라도 수업 진행 사실로 usedCount는 1 차감되어야 한다")
                .isEqualTo(5);
        assertThat(reloaded.getStatus())
                .as("아직 한도가 남았으므로 활성 유지")
                .isEqualTo(MembershipStatus.활성);
    }

    @Test
    void 결석으로_마지막_횟수가_소진되면_만료로_전환된다() {
        // given — totalCount=3, usedCount=2 → 한 번 더 소비하면 소진
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-absent-expire-" + System.nanoTime())
                .build());

        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("화목").daysOfWeek("TUE,THU")
                .startTime(LocalTime.of(19, 0)).endTime(LocalTime.of(20, 0))
                .build());

        ComplexClass clazz = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("필라테스").capacity(10).sortOrder(0)
                .build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("3회권").duration(30).count(3).price(60000).build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("계백").phoneNumber("01044445555").branch(branch).build());

        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusDays(30))
                .totalCount(3)
                .usedCount(2)
                .status(MembershipStatus.활성)
                .build());

        BulkAttendanceRequest.BulkMember bm = new BulkAttendanceRequest.BulkMember();
        bm.setMemberSeq(member.getSeq());
        bm.setAttended(false);
        BulkAttendanceRequest req = new BulkAttendanceRequest();
        req.setClassSeq(clazz.getSeq());
        req.setMembers(List.of(bm));

        // when
        attendanceService.processBulkAttendance(req);

        // then — 결석으로도 마지막 횟수가 소진되어 만료
        ComplexMemberMembership reloaded = memberMembershipRepository.findById(mm.getSeq()).orElseThrow();
        assertThat(reloaded.getUsedCount()).isEqualTo(3);
        assertThat(reloaded.getStatus())
                .as("결석이라도 횟수가 소진되면 만료로 전환되어야 한다")
                .isEqualTo(MembershipStatus.만료);
    }
}
