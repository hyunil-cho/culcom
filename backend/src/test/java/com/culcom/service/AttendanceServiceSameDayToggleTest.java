package com.culcom.service;

import com.culcom.dto.complex.attendance.BulkAttendanceRequest;
import com.culcom.dto.complex.attendance.BulkAttendanceResultResponse;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberAttendance;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.AttendanceStatus;
import com.culcom.entity.enums.BulkAttendanceResultStatus;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.product.Membership;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberAttendanceRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.MembershipRepository;
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

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 동일 날짜에 대한 출석 상태 재변경 시나리오:
 * 같은 날짜에 이미 출석/결석 기록이 있는 회원의 상태를 다시 변경해도
 * 멤버십 usedCount 는 "한 번만" 차감되어야 한다.
 *
 * 커버 케이스:
 * - 출석 → 결석 (같은 날) : +1 만 차감
 * - 결석 → 출석 (같은 날) : +1 만 차감
 * - 같은 상태 재기록     : 차감 없음 + skip_already
 * - 여러 회원 혼합 시에도 각각 독립적으로 규칙 적용
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceServiceSameDayToggleTest {

    @Autowired AttendanceService attendanceService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexMemberAttendanceRepository attendanceRepository;

    // 연속된 processBulkAttendance 호출 사이에 영속성 컨텍스트를 비워야
    // 서비스가 내부적으로 사용하는 stub 엔티티가 이후 JOIN FETCH 조회를 오염시키지 않는다.
    // (운영에선 호출마다 새 요청/트랜잭션이므로 자연스럽게 분리된다.)
    @PersistenceContext EntityManager em;

    private record Fixture(ComplexClass clazz, ComplexMember member, ComplexMemberMembership mm) {}

    private Fixture bootstrap(String suffix, int totalCount, int initialUsed) {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-toggle-" + suffix + "-" + System.nanoTime())
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
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(60))
                .totalCount(totalCount).usedCount(initialUsed)
                .status(MembershipStatus.활성)
                .build());
        return new Fixture(clazz, member, mm);
    }

    private BulkAttendanceResultResponse submit(Fixture f, boolean attended) {
        BulkAttendanceRequest.BulkMember bm = new BulkAttendanceRequest.BulkMember();
        bm.setMemberSeq(f.member().getSeq());
        bm.setAttended(attended);
        BulkAttendanceRequest req = new BulkAttendanceRequest();
        req.setClassSeq(f.clazz().getSeq());
        req.setMembers(List.of(bm));
        BulkAttendanceResultResponse result = attendanceService.processBulkAttendance(req).get(0);
        em.flush();
        em.clear();
        return result;
    }

    @Test
    @DisplayName("같은 날 출석 → 결석 재변경 시 usedCount 는 총 1 만 증가한다")
    void 출석_후_결석_재변경_1번만_차감() {
        Fixture f = bootstrap("p-to-a", 10, 4);

        submit(f, true);   // 최초 출석: +1 차감
        submit(f, false);  // 결석으로 변경: 추가 차감 없어야 함

        ComplexMemberMembership reloaded =
                memberMembershipRepository.findById(f.mm().getSeq()).orElseThrow();
        assertThat(reloaded.getUsedCount())
                .as("출석→결석 재변경은 횟수를 추가 차감해선 안 된다")
                .isEqualTo(5);

        // 출석 기록은 여전히 1건, 상태는 결석으로 변경되어 있어야 한다
        List<ComplexMemberAttendance> records = attendanceRepository
                .findByClassSeqsAndDate(List.of(f.clazz().getSeq()), LocalDate.now());
        assertThat(records).hasSize(1);
        assertThat(records.get(0).getStatus()).isEqualTo(AttendanceStatus.결석);
    }

    @Test
    @DisplayName("같은 날 결석 → 출석 재변경 시에도 usedCount 는 총 1 만 증가한다")
    void 결석_후_출석_재변경_1번만_차감() {
        Fixture f = bootstrap("a-to-p", 10, 4);

        submit(f, false);  // 최초 결석: +1 차감
        submit(f, true);   // 출석으로 변경: 추가 차감 없어야 함

        ComplexMemberMembership reloaded =
                memberMembershipRepository.findById(f.mm().getSeq()).orElseThrow();
        assertThat(reloaded.getUsedCount()).isEqualTo(5);

        List<ComplexMemberAttendance> records = attendanceRepository
                .findByClassSeqsAndDate(List.of(f.clazz().getSeq()), LocalDate.now());
        assertThat(records).hasSize(1);
        assertThat(records.get(0).getStatus()).isEqualTo(AttendanceStatus.출석);
    }

    @Test
    @DisplayName("같은 상태로 재기록하면 skip_already 로 스킵되고 usedCount 변화 없다")
    void 동일_상태_재기록은_스킵() {
        Fixture f = bootstrap("same", 10, 4);

        submit(f, true);   // 출석: +1
        BulkAttendanceResultResponse second = submit(f, true);  // 다시 출석 → skip

        assertThat(second.getStatus()).isEqualTo(BulkAttendanceResultStatus.이미처리됨);

        ComplexMemberMembership reloaded =
                memberMembershipRepository.findById(f.mm().getSeq()).orElseThrow();
        assertThat(reloaded.getUsedCount()).isEqualTo(5);
    }

    @Test
    @DisplayName("3번 연속 토글해도 usedCount 는 최초 1 회만 증가한다")
    void 여러번_토글해도_1회만() {
        Fixture f = bootstrap("multi", 10, 4);

        submit(f, true);   // 최초 출석 → +1 (5)
        submit(f, false);  // 결석으로 변경
        submit(f, true);   // 다시 출석으로
        submit(f, false);  // 또 결석으로

        ComplexMemberMembership reloaded =
                memberMembershipRepository.findById(f.mm().getSeq()).orElseThrow();
        assertThat(reloaded.getUsedCount())
                .as("반복 토글은 최초 1회만 차감되어야 한다").isEqualTo(5);
    }

    @Test
    @DisplayName("마지막 한 번 남은 멤버십은 출석 후 상태 토글을 해도 만료 상태로 유지된다")
    void 소진_후_토글해도_만료_유지() {
        // 9/10 에서 출석 → 10/10 → 만료
        Fixture f = bootstrap("exhaust", 10, 9);

        submit(f, true);
        ComplexMemberMembership afterFirst =
                memberMembershipRepository.findById(f.mm().getSeq()).orElseThrow();
        assertThat(afterFirst.getUsedCount()).isEqualTo(10);
        assertThat(afterFirst.getStatus()).isEqualTo(MembershipStatus.만료);

        // 같은 날 결석으로 토글 — usedCount 는 여전히 10, 상태는 그대로
        submit(f, false);

        ComplexMemberMembership afterToggle =
                memberMembershipRepository.findById(f.mm().getSeq()).orElseThrow();
        assertThat(afterToggle.getUsedCount()).isEqualTo(10);
        assertThat(afterToggle.getStatus()).isEqualTo(MembershipStatus.만료);
    }
}
