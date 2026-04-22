package com.culcom.mapper;

import com.culcom.dto.complex.attendance.StaffAttendanceRateSummary;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberAttendance;
import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import com.culcom.entity.enums.AttendanceStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberAttendanceRepository;
import com.culcom.repository.ComplexMemberClassMappingRepository;
import com.culcom.repository.ComplexMemberRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link AttendanceViewQueryMapper#selectAllStaffAttendanceRates} 검증.
 *
 * 쿼리의 계약: "해당 스태프가 리더(c.staff_seq)로 배정된 수업에서 본인이 직접 찍은 출석"만 집계한다.
 * 같은 스태프가 다른 팀에 일반 멤버로도 등록되어 출석한 기록은 결과에서 제외되어야 한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SelectAllStaffAttendanceRatesTest {

    @Autowired AttendanceViewQueryMapper mapper;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository timeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberClassMappingRepository mappingRepository;
    @Autowired ComplexMemberAttendanceRepository attendanceRepository;

    @PersistenceContext EntityManager em;

    private Branch branch;

    @BeforeEach
    void setUp() {
        branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-staff-rate-" + System.nanoTime())
                .build());
    }

    @Test
    @DisplayName("리더로 찍은 출석만 집계되고, 같은 스태프가 다른 팀에 팀원으로 찍은 출석은 제외된다")
    void 리더출석만_집계된다() {
        ClassTimeSlot slot = newSlot();

        ComplexMember staff1 = newMember("스태프1");
        ComplexMember staff2 = newMember("스태프2");

        ComplexClass classA = newClass(slot, "ClassA", staff1);   // staff1이 리더
        ComplexClass classB = newClass(slot, "ClassB", staff2);   // staff2가 리더

        // 교차 팀원 등록: staff1은 ClassB의 팀원, staff2는 ClassA의 팀원
        mappingRepository.save(ComplexMemberClassMapping.builder()
                .complexClass(classB).member(staff1).sortOrder(0).build());
        mappingRepository.save(ComplexMemberClassMapping.builder()
                .complexClass(classA).member(staff2).sortOrder(0).build());

        LocalDate today = LocalDate.now();
        LocalDate fromDate = today.minusMonths(3);

        // staff1: 리더 자격(ClassA)으로 출석 3회 / 결석 1회 → 집계 대상
        attend(staff1, classA, today.minusDays(1), AttendanceStatus.출석);
        attend(staff1, classA, today.minusDays(3), AttendanceStatus.출석);
        attend(staff1, classA, today.minusDays(5), AttendanceStatus.출석);
        attend(staff1, classA, today.minusDays(7), AttendanceStatus.결석);

        // staff1: 팀원 자격(ClassB)으로 출석 2회 → 집계 제외
        attend(staff1, classB, today.minusDays(2), AttendanceStatus.출석);
        attend(staff1, classB, today.minusDays(4), AttendanceStatus.출석);

        // staff2: 리더 자격(ClassB)으로 출석 2회 → 집계 대상
        attend(staff2, classB, today.minusDays(1), AttendanceStatus.출석);
        attend(staff2, classB, today.minusDays(3), AttendanceStatus.출석);

        // staff2: 팀원 자격(ClassA)으로 결석 1회 → 집계 제외
        attend(staff2, classA, today.minusDays(5), AttendanceStatus.결석);

        em.flush();
        em.clear();

        Map<Long, StaffAttendanceRateSummary> byStaff =
                mapper.selectAllStaffAttendanceRates(branch.getSeq(), fromDate).stream()
                        .collect(Collectors.toMap(StaffAttendanceRateSummary::getStaffSeq, r -> r));

        StaffAttendanceRateSummary r1 = byStaff.get(staff1.getSeq());
        assertThat(r1).as("staff1 집계가 존재해야 함").isNotNull();
        assertThat(r1.getTotalCount()).as("staff1 리더 출석 총건수 (ClassA 4건만)").isEqualTo(4);
        assertThat(r1.getPresentCount()).as("staff1 리더 출석 중 출석 (결석 1건 제외)").isEqualTo(3);

        StaffAttendanceRateSummary r2 = byStaff.get(staff2.getSeq());
        assertThat(r2).as("staff2 집계가 존재해야 함").isNotNull();
        assertThat(r2.getTotalCount()).as("staff2 리더 출석 총건수 (ClassB 2건만)").isEqualTo(2);
        assertThat(r2.getPresentCount()).as("staff2 리더 출석 중 출석").isEqualTo(2);
    }

    @Test
    @DisplayName("팀원 출석만 있고 리더 출석이 없는 스태프는 결과에 포함되지 않는다")
    void 팀원출석만_있는_스태프는_결과에_포함되지_않는다() {
        ClassTimeSlot slot = newSlot();

        ComplexMember leader = newMember("리더");
        ComplexMember otherStaff = newMember("다른스태프");

        ComplexClass cls = newClass(slot, "Class", leader);
        mappingRepository.save(ComplexMemberClassMapping.builder()
                .complexClass(cls).member(otherStaff).sortOrder(0).build());

        LocalDate today = LocalDate.now();
        // otherStaff는 팀원으로만 출석 → 집계 결과에 등장하지 않아야 함
        attend(otherStaff, cls, today.minusDays(1), AttendanceStatus.출석);
        attend(otherStaff, cls, today.minusDays(2), AttendanceStatus.결석);

        em.flush();
        em.clear();

        List<StaffAttendanceRateSummary> result =
                mapper.selectAllStaffAttendanceRates(branch.getSeq(), today.minusMonths(3));

        assertThat(result)
                .extracting(StaffAttendanceRateSummary::getStaffSeq)
                .doesNotContain(otherStaff.getSeq());
    }

    @Test
    @DisplayName("fromDate 이전에 찍힌 출석 기록은 집계에서 제외된다")
    void fromDate_이전_기록은_제외된다() {
        ClassTimeSlot slot = newSlot();
        ComplexMember staff = newMember("스태프");
        ComplexClass cls = newClass(slot, "Class", staff);

        LocalDate fromDate = LocalDate.now().minusMonths(3);

        // fromDate 직전 (경계) — 제외
        attend(staff, cls, fromDate.minusDays(1), AttendanceStatus.출석);
        attend(staff, cls, fromDate.minusDays(30), AttendanceStatus.출석);
        // fromDate 당일 / 이후 — 포함
        attend(staff, cls, fromDate, AttendanceStatus.출석);
        attend(staff, cls, fromDate.plusDays(1), AttendanceStatus.결석);

        em.flush();
        em.clear();

        List<StaffAttendanceRateSummary> result =
                mapper.selectAllStaffAttendanceRates(branch.getSeq(), fromDate);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStaffSeq()).isEqualTo(staff.getSeq());
        assertThat(result.get(0).getTotalCount()).isEqualTo(2);
        assertThat(result.get(0).getPresentCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("다른 지점의 리더 출석은 집계에서 제외된다")
    void 다른지점_기록은_제외된다() {
        Branch otherBranch = branchRepository.save(Branch.builder()
                .branchName("다른지점")
                .alias("test-other-" + System.nanoTime())
                .build());

        ClassTimeSlot localSlot = newSlot();
        ClassTimeSlot otherSlot = timeSlotRepository.save(ClassTimeSlot.builder()
                .branch(otherBranch).name("타지점슬롯").daysOfWeek("MON")
                .startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(11, 0))
                .build());

        ComplexMember staff = newMember("스태프");
        ComplexClass localClass = newClass(localSlot, "LocalClass", staff);
        ComplexClass otherClass = classRepository.save(ComplexClass.builder()
                .branch(otherBranch).timeSlot(otherSlot).name("OtherClass")
                .capacity(10).sortOrder(0).staff(staff)
                .build());

        LocalDate today = LocalDate.now();
        attend(staff, localClass, today.minusDays(1), AttendanceStatus.출석);
        attend(staff, otherClass, today.minusDays(1), AttendanceStatus.출석);

        em.flush();
        em.clear();

        List<StaffAttendanceRateSummary> result =
                mapper.selectAllStaffAttendanceRates(branch.getSeq(), today.minusMonths(3));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTotalCount())
                .as("branchSeq에 속한 수업 1건만 집계").isEqualTo(1);
    }

    // ── 헬퍼 ──

    private ClassTimeSlot newSlot() {
        return timeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("슬롯-" + System.nanoTime())
                .daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(11, 0))
                .build());
    }

    private ComplexClass newClass(ClassTimeSlot slot, String name, ComplexMember staffLeader) {
        return classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name(name)
                .capacity(10).sortOrder(0).staff(staffLeader)
                .build());
    }

    private ComplexMember newMember(String name) {
        return memberRepository.save(ComplexMember.builder()
                .branch(branch).name(name)
                .phoneNumber("010" + (System.nanoTime() % 100000000L))
                .build());
    }

    private void attend(ComplexMember member, ComplexClass cls, LocalDate date, AttendanceStatus status) {
        attendanceRepository.save(ComplexMemberAttendance.builder()
                .member(member).complexClass(cls)
                .attendanceDate(date).status(status).build());
    }
}
