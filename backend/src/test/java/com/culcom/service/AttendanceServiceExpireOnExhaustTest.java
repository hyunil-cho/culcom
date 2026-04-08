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

        // when — 마지막 한 번 출석 처리 (usedCount: 2 → 3)
        List<BulkAttendanceResultResponse> results = attendanceService.processBulkAttendance(req);

        // then — 출석 정상 처리 + 횟수 소진 + 상태 자동 만료
        assertThat(results.get(0).getStatus()).isEqualTo("출석");

        ComplexMemberMembership reloaded = memberMembershipRepository.findById(mm.getSeq()).orElseThrow();
        assertThat(reloaded.getUsedCount())
                .as("마지막 출석으로 totalCount에 도달")
                .isEqualTo(3);
        assertThat(reloaded.getStatus())
                .as("횟수 소진 시 status가 자동으로 만료로 전환되어야 한다")
                .isEqualTo(MembershipStatus.만료);
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
