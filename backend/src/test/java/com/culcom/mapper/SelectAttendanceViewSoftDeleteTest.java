package com.culcom.mapper;

import com.culcom.dto.complex.attendance.AttendanceViewRow;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
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

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link AttendanceViewQueryMapper#selectAttendanceView} 의 soft-delete 필터 검증.
 *
 * 계약:
 *  - {@code class_time_slots.deleted = TRUE} 인 시간대는 결과에 노출되지 않는다.
 *  - {@code complex_classes.deleted = TRUE} 인 수업은 결과에 노출되지 않는다.
 *    (해당 수업의 리더/회원 행도 함께 제외)
 *  - 빈 시간대(수업이 하나도 없음)는 LEFT JOIN 의미상 슬롯 정보만이라도 노출되어야 한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SelectAttendanceViewSoftDeleteTest {

    @Autowired AttendanceViewQueryMapper mapper;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository timeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired ComplexMemberRepository memberRepository;

    @PersistenceContext EntityManager em;

    private Branch branch;

    @BeforeEach
    void setUp() {
        branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점-" + System.nanoTime())
                .alias("test-slot-softdel-" + System.nanoTime())
                .build());
    }

    @Test
    @DisplayName("deleted=true 인 ClassTimeSlot 은 selectAttendanceView 결과에 포함되지 않는다")
    void 삭제된_시간대는_노출되지_않는다() {
        ClassTimeSlot activeSlot = saveSlot("활성슬롯", false);
        ClassTimeSlot deletedSlot = saveSlot("삭제슬롯", true);

        // 양쪽 슬롯 모두 리더 있는 수업을 달아 둬야, "슬롯 자체의 누락"과 "수업이 없어 안나옴"이 구분된다
        ComplexMember leaderA = newMember("리더A");
        ComplexMember leaderB = newMember("리더B");
        saveClass(activeSlot, "활성수업", leaderA);
        saveClass(deletedSlot, "삭제슬롯수업", leaderB);

        em.flush();
        em.clear();

        LocalDate today = LocalDate.now();
        List<AttendanceViewRow> rows =
                mapper.selectAttendanceView(branch.getSeq(), today, today.minusDays(7));

        assertThat(rows)
                .as("삭제된 슬롯의 seq 는 결과에 나타나지 않아야 함")
                .extracting(AttendanceViewRow::getTimeSlotSeq)
                .doesNotContain(deletedSlot.getSeq())
                .contains(activeSlot.getSeq());

        assertThat(rows)
                .as("삭제된 슬롯에 묶인 수업의 회원/스태프 행도 함께 제외되어야 함")
                .extracting(AttendanceViewRow::getMemberSeq)
                .doesNotContain(leaderB.getSeq());
    }

    @Test
    @DisplayName("지점의 모든 슬롯이 deleted=true 이면 결과는 빈 리스트")
    void 전부_삭제된_지점은_빈결과() {
        ClassTimeSlot deleted1 = saveSlot("삭제1", true);
        ClassTimeSlot deleted2 = saveSlot("삭제2", true);
        saveClass(deleted1, "수업1", newMember("M1"));
        saveClass(deleted2, "수업2", newMember("M2"));

        em.flush();
        em.clear();

        LocalDate today = LocalDate.now();
        List<AttendanceViewRow> rows =
                mapper.selectAttendanceView(branch.getSeq(), today, today.minusDays(7));

        assertThat(rows)
                .as("활성 슬롯이 없으면 어떤 행도 반환되지 않아야 함")
                .isEmpty();
    }

    @Test
    @DisplayName("deleted=true 인 ComplexClass 는 selectAttendanceView 결과에 포함되지 않는다")
    void 삭제된_수업은_노출되지_않는다() {
        ClassTimeSlot slot = saveSlot("슬롯", false);

        ComplexMember activeLeader = newMember("활성리더");
        ComplexMember deletedLeader = newMember("삭제수업리더");

        ComplexClass activeClass = saveClass(slot, "활성수업", activeLeader, false);
        ComplexClass deletedClass = saveClass(slot, "삭제수업", deletedLeader, true);

        em.flush();
        em.clear();

        LocalDate today = LocalDate.now();
        List<AttendanceViewRow> rows =
                mapper.selectAttendanceView(branch.getSeq(), today, today.minusDays(7));

        assertThat(rows)
                .as("삭제된 수업의 classSeq 는 결과에 나타나지 않아야 함")
                .extracting(AttendanceViewRow::getClassSeq)
                .doesNotContain(deletedClass.getSeq())
                .contains(activeClass.getSeq());

        assertThat(rows)
                .as("삭제된 수업의 리더(스태프) 행도 함께 제외되어야 함")
                .extracting(AttendanceViewRow::getMemberSeq)
                .doesNotContain(deletedLeader.getSeq())
                .contains(activeLeader.getSeq());
    }

    @Test
    @DisplayName("같은 슬롯의 모든 수업이 deleted=true 라도, 슬롯 자체는 빈 행으로 노출된다")
    void 수업이_모두_삭제된_슬롯도_슬롯행은_노출된다() {
        ClassTimeSlot slot = saveSlot("슬롯", false);
        saveClass(slot, "수업1", newMember("리더1"), true);
        saveClass(slot, "수업2", newMember("리더2"), true);

        em.flush();
        em.clear();

        LocalDate today = LocalDate.now();
        List<AttendanceViewRow> rows =
                mapper.selectAttendanceView(branch.getSeq(), today, today.minusDays(7));

        // "빈 수업도 LEFT JOIN 으로 자연스럽게 포함" 계약 — 슬롯 정보만이라도 노출되어야 한다.
        // (현재 XML 이 WHERE 절에 c.deleted=0 을 넣어 LEFT JOIN 을 INNER 로 만들면 이 단언이 실패한다.)
        assertThat(rows)
                .as("슬롯의 모든 수업이 삭제됐어도 슬롯 자체는 결과에 남아야 함")
                .extracting(AttendanceViewRow::getTimeSlotSeq)
                .contains(slot.getSeq());

        assertThat(rows)
                .as("삭제된 수업의 classSeq 는 어떤 행에도 노출되지 않아야 함")
                .allSatisfy(r -> assertThat(r.getClassSeq()).isNull());
    }

    // ── 헬퍼 ──

    private ClassTimeSlot saveSlot(String name, boolean deleted) {
        return timeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch)
                .name(name + "-" + System.nanoTime())
                .daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .deleted(deleted)
                .build());
    }

    private ComplexClass saveClass(ClassTimeSlot slot, String name, ComplexMember staffLeader) {
        return saveClass(slot, name, staffLeader, false);
    }

    private ComplexClass saveClass(ClassTimeSlot slot, String name, ComplexMember staffLeader, boolean deleted) {
        return classRepository.save(ComplexClass.builder()
                .branch(branch)
                .timeSlot(slot)
                .name(name + "-" + System.nanoTime())
                .capacity(10)
                .sortOrder(0)
                .staff(staffLeader)
                .deleted(deleted)
                .build());
    }

    private ComplexMember newMember(String name) {
        return memberRepository.save(ComplexMember.builder()
                .branch(branch)
                .name(name)
                .phoneNumber("010" + (System.nanoTime() % 100000000L))
                .build());
    }
}