package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.exception.EntityNotFoundException;
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
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * ClassTimeSlotService.delete (soft-delete) 통합 테스트.
 *
 * 정책:
 *  - 시간대를 사용하는 활성 팀이 하나라도 있으면 IllegalStateException 차단
 *  - 안 쓰이면 soft-delete 성공
 *  - soft-deleted 시간대는 활성 list 에서 제외
 *  - soft-deleted 팀이 참조하던 시간대는 "사용 중" 으로 카운트되지 않음
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ClassTimeSlotServiceDeleteTest {

    @Autowired ClassTimeSlotService timeSlotService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository timeSlotRepository;
    @Autowired ComplexClassRepository classRepository;

    private Fixture setup(String suffix) {
        String unique = suffix + "-" + System.nanoTime();
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점-" + unique)
                .alias("test-delete-slot-" + unique)
                .build());
        ClassTimeSlot slot = timeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금-" + unique).daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());
        return new Fixture(branch, slot);
    }

    @Test
    void 사용_중인_팀이_없으면_정상_soft_delete() {
        Fixture f = setup("clean");

        timeSlotService.delete(f.slot.getSeq());

        assertThat(timeSlotRepository.findBySeqAndDeletedFalse(f.slot.getSeq())).isEmpty();
        assertThat(timeSlotRepository.findById(f.slot.getSeq()).orElseThrow().getDeleted()).isTrue();
    }

    @Test
    void 사용_중인_활성_팀이_있으면_IllegalStateException으로_차단() {
        Fixture f = setup("in-use");
        classRepository.save(ComplexClass.builder()
                .branch(f.branch).timeSlot(f.slot)
                .name("팀-" + System.nanoTime()).capacity(10).sortOrder(1).build());

        assertThatThrownBy(() -> timeSlotService.delete(f.slot.getSeq()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("사용 중인 팀");

        assertThat(timeSlotRepository.findById(f.slot.getSeq()).orElseThrow().getDeleted()).isFalse();
    }

    @Test
    void soft_deleted_팀만_있는_시간대는_삭제_가능() {
        // 팀을 만들었다가 soft-delete 한 뒤 시간대 삭제 → "사용 중" 카운트는 0 이라 통과해야 함
        Fixture f = setup("only-deleted-team");
        ComplexClass cls = classRepository.save(ComplexClass.builder()
                .branch(f.branch).timeSlot(f.slot)
                .name("팀-" + System.nanoTime()).capacity(10).sortOrder(1)
                .deleted(true).build());

        assertThatCode(() -> timeSlotService.delete(f.slot.getSeq())).doesNotThrowAnyException();
        assertThat(timeSlotRepository.findById(f.slot.getSeq()).orElseThrow().getDeleted()).isTrue();
    }

    @Test
    void soft_deleted_시간대는_list에서_제외된다() {
        Fixture f = setup("list");
        timeSlotService.delete(f.slot.getSeq());

        assertThat(timeSlotService.list(f.branch.getSeq()))
                .as("활성 list 에서 deleted 시간대는 제외되어야 한다")
                .extracting("seq")
                .doesNotContain(f.slot.getSeq());
    }

    @Test
    void 이미_soft_deleted된_시간대_재삭제_시도는_EntityNotFoundException() {
        Fixture f = setup("double-delete");
        timeSlotService.delete(f.slot.getSeq());

        assertThatThrownBy(() -> timeSlotService.delete(f.slot.getSeq()))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void soft_delete_후_같은_이름으로_새_시간대_생성_가능() {
        Fixture f = setup("name-reuse");
        String dupName = f.slot.getName();

        timeSlotService.delete(f.slot.getSeq());
        timeSlotRepository.flush();

        assertThatCode(() -> {
            timeSlotRepository.save(ClassTimeSlot.builder()
                    .branch(f.branch).name(dupName).daysOfWeek("TUE,THU")
                    .startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(11, 0))
                    .build());
            timeSlotRepository.flush();
        }).doesNotThrowAnyException();
    }

    private record Fixture(Branch branch, ClassTimeSlot slot) {}
}
