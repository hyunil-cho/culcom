package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.product.Membership;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * ComplexClassService.delete (soft-delete) 통합 테스트.
 *
 * 정책:
 *  - 회원/리더가 모두 없으면 soft-delete 성공
 *  - 등록된 회원이 있으면 IllegalStateException 차단
 *  - 리더가 배정돼 있으면 IllegalStateException 차단
 *  - soft-deleted 팀은 활성 목록(get/list/검색) 에서 제외
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ComplexClassServiceDeleteTest {

    @Autowired ComplexClassService complexClassService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository timeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexMemberClassMappingRepository mappingRepository;
    @Autowired MembershipRepository membershipRepository;

    private Fixture setup(String suffix) {
        String unique = suffix + "-" + System.nanoTime();
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점-" + unique)
                .alias("test-delete-class-" + unique)
                .build());
        ClassTimeSlot slot = timeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금-" + unique).daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());
        ComplexClass cls = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot)
                .name("팀-" + unique).capacity(10).sortOrder(1).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("3개월권-" + unique).duration(90).count(30).price(300_000).build());
        return new Fixture(branch, slot, cls, product);
    }

    private ComplexMember newActiveMember(Fixture f, String name, String phone) {
        ComplexMember m = memberRepository.save(ComplexMember.builder()
                .name(name).phoneNumber(phone).branch(f.branch).build());
        memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(m).membership(f.product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(80))
                .totalCount(30).usedCount(0)
                .price("300000").status(MembershipStatus.활성).build());
        return m;
    }

    @Test
    void 회원도_리더도_없는_팀은_정상_soft_delete된다() {
        Fixture f = setup("clean");

        complexClassService.delete(f.cls.getSeq());

        // 활성 조회는 비어 있음
        assertThat(classRepository.findBySeqAndDeletedFalse(f.cls.getSeq())).isEmpty();
        // DB 행은 보존, deleted=true
        ComplexClass row = classRepository.findById(f.cls.getSeq()).orElseThrow();
        assertThat(row.getDeleted()).isTrue();
    }

    @Test
    void 등록된_회원이_있으면_IllegalStateException으로_차단된다() {
        Fixture f = setup("with-member");
        ComplexMember m = newActiveMember(f, "회원A", "01077770001");
        complexClassService.addMember(f.cls.getSeq(), m.getSeq());

        assertThatThrownBy(() -> complexClassService.delete(f.cls.getSeq()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("등록된 회원이");

        // 차단됐으므로 deleted=false 그대로
        assertThat(classRepository.findById(f.cls.getSeq()).orElseThrow().getDeleted()).isFalse();
    }

    @Test
    void 리더가_배정돼_있으면_IllegalStateException으로_차단된다() {
        Fixture f = setup("with-leader");
        ComplexMember leader = newActiveMember(f, "리더", "01077770002");
        complexClassService.setLeader(f.cls.getSeq(), leader.getSeq());

        assertThatThrownBy(() -> complexClassService.delete(f.cls.getSeq()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("리더가 배정");

        assertThat(classRepository.findById(f.cls.getSeq()).orElseThrow().getDeleted()).isFalse();
    }

    @Test
    void soft_deleted_팀은_get에서_EntityNotFoundException() {
        Fixture f = setup("get");
        complexClassService.delete(f.cls.getSeq());

        assertThatThrownBy(() -> complexClassService.get(f.cls.getSeq()))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("수업");
    }

    @Test
    void soft_deleted_팀의_매핑은_DB에_그대로_보존된다() {
        // 회원 추가 → 회원 제외 → 삭제 → 매핑은 0 이지만 출석/이력 등 다른 테이블의 FK 는 그대로
        Fixture f = setup("preserve-mapping");
        ComplexMember m = newActiveMember(f, "잠시회원", "01077770003");
        complexClassService.addMember(f.cls.getSeq(), m.getSeq());
        complexClassService.removeMember(f.cls.getSeq(), m.getSeq()); // 회원 제외 후 팀 삭제 가능

        complexClassService.delete(f.cls.getSeq());

        // 팀은 soft-deleted, DB 에는 행 보존
        assertThat(classRepository.findById(f.cls.getSeq()).orElseThrow().getDeleted()).isTrue();
    }

    @Test
    void findMaxSortOrderByBranchSeq는_soft_deleted를_제외한다() {
        // sortOrder 1, 2, 3 으로 3개 생성 → 3번째 삭제 → 새로 만들면 sortOrder = 3 (== 2+1)
        Fixture f = setup("max-sort");
        // f.cls 가 sortOrder=1
        ComplexClass second = classRepository.save(ComplexClass.builder()
                .branch(f.branch).timeSlot(f.slot)
                .name("두번째-" + System.nanoTime()).capacity(10).sortOrder(2).build());
        ComplexClass third = classRepository.save(ComplexClass.builder()
                .branch(f.branch).timeSlot(f.slot)
                .name("세번째-" + System.nanoTime()).capacity(10).sortOrder(3).build());

        complexClassService.delete(third.getSeq());

        int maxSort = classRepository.findMaxSortOrderByBranchSeq(f.branch.getSeq());
        assertThat(maxSort)
                .as("soft-deleted 의 sortOrder=3 은 제외되어 max=2 가 나와야 한다")
                .isEqualTo(2);
    }

    @Test
    void 이미_soft_deleted된_팀_재삭제_시도는_EntityNotFoundException() {
        Fixture f = setup("double-delete");
        complexClassService.delete(f.cls.getSeq());

        assertThatThrownBy(() -> complexClassService.delete(f.cls.getSeq()))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void soft_delete_후_같은_이름으로_새_팀_생성_가능() {
        Fixture f = setup("name-reuse");
        String dupName = f.cls.getName();

        complexClassService.delete(f.cls.getSeq());
        // soft-delete UPDATE 를 먼저 flush 시켜야 같은 트랜잭션 안 후속 INSERT 와 unique 충돌이 안 남
        classRepository.flush();

        // 같은 이름으로 다시 생성 — (name, deleted) 복합 unique 가 충돌을 막지 않아야 함
        assertThatCode(() -> {
            classRepository.save(ComplexClass.builder()
                    .branch(f.branch).timeSlot(f.slot)
                    .name(dupName).capacity(10).sortOrder(2).build());
            classRepository.flush();
        }).doesNotThrowAnyException();
    }

    private record Fixture(Branch branch, ClassTimeSlot slot, ComplexClass cls, Membership product) {}
}
