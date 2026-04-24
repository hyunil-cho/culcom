package com.culcom.service;

import com.culcom.dto.complex.classes.ComplexClassRequest;
import com.culcom.dto.complex.classes.ComplexClassResponse;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ComplexClass.sortOrder 의 자동 부여 / 보존 정책을 검증한다.
 *
 * - create: 항상 지점 내 마지막 값(max+1)으로 부여된다. 클라이언트가 지정할 수 없다.
 *   (DTO에 sortOrder 필드가 없음 — 컴파일 타임에 강제됨)
 * - update: sortOrder 는 일반 update 에서 절대 변경되지 않는다.
 *   정렬 변경은 별도 API 책임.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ComplexClassServiceUpdateSortOrderTest {

    @Autowired ComplexClassService complexClassService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;

    private Fixture setup(String suffix) {
        String unique = suffix + "-" + System.nanoTime();
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점-" + unique)
                .alias("test-sortorder-" + unique)
                .build());
        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금-" + unique).daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());
        return new Fixture(branch, slot);
    }

    private ComplexClass insertExistingClass(Fixture f, String name, int sortOrder) {
        return classRepository.save(ComplexClass.builder()
                .branch(f.branch).timeSlot(f.slot)
                .name(name + "-" + System.nanoTime())
                .capacity(10).sortOrder(sortOrder).build());
    }

    private ComplexClassRequest req(Long timeSlotSeq, String name) {
        ComplexClassRequest r = new ComplexClassRequest();
        r.setName(name);
        r.setCapacity(10);
        r.setTimeSlotSeq(timeSlotSeq);
        return r;
    }

    // ===== create: sortOrder 자동 부여 (max + 1) =====

    @Test
    void create_시_지점에_수업이_없으면_sortOrder는_1이_된다() {
        Fixture f = setup("first");

        ComplexClassResponse created = complexClassService.create(
                req(f.slot.getSeq(), "최초수업-" + System.nanoTime()), f.branch.getSeq());

        ComplexClass saved = classRepository.findById(created.getSeq()).orElseThrow();
        assertThat(saved.getSortOrder())
                .as("지점에 기존 수업이 없으면 max=0 이므로 새 수업의 sortOrder=1")
                .isEqualTo(1);
    }

    @Test
    void create_시_sortOrder는_지점내_max_플러스_1로_부여된다() {
        Fixture f = setup("max-plus-one");
        insertExistingClass(f, "기존1", 3);
        insertExistingClass(f, "기존2", 7); // max = 7

        ComplexClassResponse created = complexClassService.create(
                req(f.slot.getSeq(), "신규-" + System.nanoTime()), f.branch.getSeq());

        ComplexClass saved = classRepository.findById(created.getSeq()).orElseThrow();
        assertThat(saved.getSortOrder())
                .as("지점 내 max sortOrder(7) + 1")
                .isEqualTo(8);
    }

    @Test
    void create_여러건_연속_생성하면_sortOrder가_증가한다() {
        Fixture f = setup("sequential");

        ComplexClassResponse a = complexClassService.create(
                req(f.slot.getSeq(), "A-" + System.nanoTime()), f.branch.getSeq());
        ComplexClassResponse b = complexClassService.create(
                req(f.slot.getSeq(), "B-" + System.nanoTime()), f.branch.getSeq());
        ComplexClassResponse c = complexClassService.create(
                req(f.slot.getSeq(), "C-" + System.nanoTime()), f.branch.getSeq());

        assertThat(classRepository.findById(a.getSeq()).orElseThrow().getSortOrder()).isEqualTo(1);
        assertThat(classRepository.findById(b.getSeq()).orElseThrow().getSortOrder()).isEqualTo(2);
        assertThat(classRepository.findById(c.getSeq()).orElseThrow().getSortOrder()).isEqualTo(3);
    }

    @Test
    void create_시_sortOrder는_지점별로_독립적으로_부여된다() {
        Fixture f1 = setup("branch-A");
        Fixture f2 = setup("branch-B");
        insertExistingClass(f1, "A-기존", 5); // 지점A max = 5

        ComplexClassResponse inA = complexClassService.create(
                req(f1.slot.getSeq(), "A-신규-" + System.nanoTime()), f1.branch.getSeq());
        ComplexClassResponse inB = complexClassService.create(
                req(f2.slot.getSeq(), "B-신규-" + System.nanoTime()), f2.branch.getSeq());

        assertThat(classRepository.findById(inA.getSeq()).orElseThrow().getSortOrder())
                .as("지점A: 기존 max(5) + 1").isEqualTo(6);
        assertThat(classRepository.findById(inB.getSeq()).orElseThrow().getSortOrder())
                .as("지점B: 기존 없음, max(0) + 1").isEqualTo(1);
    }

    // ===== update: sortOrder 보존 =====

    @Test
    void update_시_sortOrder는_원래_값이_유지된다() {
        Fixture f = setup("update-preserve");
        ComplexClass existing = insertExistingClass(f, "원본", 7);

        ComplexClassRequest updateReq = req(f.slot.getSeq(), "이름변경");
        updateReq.setDescription("설명변경");
        updateReq.setCapacity(15);

        complexClassService.update(existing.getSeq(), updateReq);

        ComplexClass reloaded = classRepository.findById(existing.getSeq()).orElseThrow();
        assertThat(reloaded.getSortOrder())
                .as("일반 update 는 sortOrder 를 변경하지 않아야 한다")
                .isEqualTo(7);
        // 다른 필드는 정상 반영되었는지도 함께 확인 (sortOrder 보존이 다른 변경을 막지 않음을 보장)
        assertThat(reloaded.getName()).isEqualTo("이름변경");
        assertThat(reloaded.getCapacity()).isEqualTo(15);
    }

    @Test
    void update_여러번_호출해도_sortOrder는_원래_값이_유지된다() {
        Fixture f = setup("update-many");
        ComplexClass existing = insertExistingClass(f, "원본", 4);

        for (int i = 0; i < 3; i++) {
            ComplexClassRequest r = req(f.slot.getSeq(), "변경-" + i);
            r.setCapacity(10 + i);
            complexClassService.update(existing.getSeq(), r);
        }

        assertThat(classRepository.findById(existing.getSeq()).orElseThrow().getSortOrder())
                .as("update를 반복해도 sortOrder 는 절대 변하지 않아야 한다")
                .isEqualTo(4);
    }

    private record Fixture(Branch branch, ClassTimeSlot slot) {}
}
