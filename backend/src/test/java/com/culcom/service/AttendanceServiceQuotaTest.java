package com.culcom.service;

import com.culcom.dto.complex.attendance.BulkAttendanceRequest;
import com.culcom.dto.complex.attendance.BulkAttendanceResultResponse;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
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
 * 회원이 멤버십이 허용한 횟수(totalCount)를 모두 사용한 경우(usedCount >= totalCount),
 * 추가 출석 처리는 거부되고 usedCount가 totalCount를 넘지 않아야 한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceServiceQuotaTest {

    @Autowired AttendanceService attendanceService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;

    @Test
    void 멤버십_사용횟수_초과시_출석_거부() {
        // given
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-quota-" + System.nanoTime())
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
                .name("성춘향").phoneNumber("01011112222").branch(branch).build());

        // totalCount=10, usedCount=10 → 한도 소진
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusDays(60))
                .totalCount(10)
                .usedCount(10)
                .build());

        BulkAttendanceRequest.BulkMember bm = new BulkAttendanceRequest.BulkMember();
        bm.setMemberSeq(member.getSeq());
        bm.setAttended(true);

        BulkAttendanceRequest req = new BulkAttendanceRequest();
        req.setClassSeq(clazz.getSeq());
        req.setMembers(List.of(bm));

        // when
        List<BulkAttendanceResultResponse> results = attendanceService.processBulkAttendance(req);

        // then — 한도 초과로 skip 되고 usedCount는 그대로
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getStatus())
                .as("멤버십 사용횟수 초과 시 skip_quota_exceeded 반환")
                .isEqualTo("skip_quota_exceeded");

        ComplexMemberMembership reloaded = memberMembershipRepository.findById(mm.getSeq()).orElseThrow();
        assertThat(reloaded.getUsedCount())
                .as("usedCount는 totalCount를 넘지 않아야 한다")
                .isEqualTo(10);
    }

    @Test
    void 마지막_한_번은_허용되고_그_다음은_거부() {
        // given — totalCount=2, usedCount=1 (1번 더 가능)
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-quota-edge-" + System.nanoTime())
                .build());

        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("화목").daysOfWeek("TUE,THU")
                .startTime(LocalTime.of(19, 0)).endTime(LocalTime.of(20, 0))
                .build());

        ComplexClass clazz = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("필라테스B").capacity(10).sortOrder(0)
                .build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("2회권").duration(30).count(2).price(40000).build());

        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("이도령").phoneNumber("01033334444").branch(branch).build());

        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusDays(30))
                .totalCount(2)
                .usedCount(1)
                .build());

        BulkAttendanceRequest.BulkMember bm = new BulkAttendanceRequest.BulkMember();
        bm.setMemberSeq(member.getSeq());
        bm.setAttended(true);
        BulkAttendanceRequest req = new BulkAttendanceRequest();
        req.setClassSeq(clazz.getSeq());
        req.setMembers(List.of(bm));

        // when — 마지막 한 횟수 사용 (usedCount 1 → 2). 정확히 한도에 도달.
        List<BulkAttendanceResultResponse> first = attendanceService.processBulkAttendance(req);

        // then — 출석 정상 처리 + usedCount == totalCount
        assertThat(first.get(0).getStatus()).isEqualTo("출석");
        assertThat(memberMembershipRepository.findById(mm.getSeq()).orElseThrow().getUsedCount())
                .as("한도에 도달했지만 마지막 한 회는 정상 사용되어야 한다")
                .isEqualTo(2);
    }
}
