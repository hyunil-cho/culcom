package com.culcom.service;

import com.culcom.dto.complex.classes.ClassReorderRequest;
import com.culcom.dto.complex.classes.MemberReorderRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ClassTimeSlotRepository;
import com.culcom.repository.ComplexClassRepository;
import com.culcom.repository.ComplexMemberClassMappingRepository;
import com.culcom.repository.ComplexMemberRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 출석 화면의 분반/회원 자리바꿈(swap) 후 sortOrder 영속성 검증.
 *
 * 프론트엔드는 두 항목의 위치만 교환한 뒤 전체 리스트를 sortOrder 재할당하여 보낸다.
 * 조회 시 sortOrder 기준으로 정렬되므로, 자리바꿈 결과가 새로고침 후에도 유지되어야 한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceServiceReorderTest {

    @Autowired AttendanceService attendanceService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberClassMappingRepository mappingRepository;

    @PersistenceContext EntityManager em;

    private Branch branch;
    private ClassTimeSlot slot;

    @BeforeEach
    void setUp() {
        branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("reorder-" + System.nanoTime())
                .build());
        slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금").daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());
    }

    private ComplexClass newClass(String name, int sortOrder) {
        return classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name(name).capacity(10).sortOrder(sortOrder)
                .build());
    }

    private ComplexMember newMember(String name) {
        return memberRepository.save(ComplexMember.builder()
                .name(name)
                .phoneNumber("010" + (System.nanoTime() % 100000000L))
                .branch(branch)
                .build());
    }

    private ComplexMemberClassMapping attach(ComplexMember m, ComplexClass c, int sortOrder) {
        return mappingRepository.save(ComplexMemberClassMapping.builder()
                .member(m).complexClass(c).sortOrder(sortOrder)
                .build());
    }

    private ClassReorderRequest.ClassOrder classOrder(Long id, int sortOrder) {
        ClassReorderRequest.ClassOrder o = new ClassReorderRequest.ClassOrder();
        o.setId(id);
        o.setSortOrder(sortOrder);
        return o;
    }

    private MemberReorderRequest.MemberOrder memberOrder(Long memberSeq, int sortOrder) {
        MemberReorderRequest.MemberOrder o = new MemberReorderRequest.MemberOrder();
        o.setMemberSeq(memberSeq);
        o.setSortOrder(sortOrder);
        return o;
    }

    @Nested
    class 분반_순서_자리바꿈 {

        @Test
        @DisplayName("첫 분반과 마지막 분반을 자리바꿈하면 가운데 분반은 그대로 영속된다")
        void 분반_첫_마지막_자리바꿈_영속성() {
            ComplexClass a = newClass("A반", 0);
            ComplexClass b = newClass("B반", 1);
            ComplexClass c = newClass("C반", 2);

            // A ↔ C 자리바꿈: A(0)→2, C(2)→0, B 는 1 유지.
            ClassReorderRequest req = new ClassReorderRequest();
            req.setClassOrders(List.of(
                    classOrder(c.getSeq(), 0),
                    classOrder(b.getSeq(), 1),
                    classOrder(a.getSeq(), 2)
            ));
            attendanceService.reorderClasses(req);
            em.flush();
            em.clear();

            List<ComplexClass> persisted = classRepository
                    .findByBranchSeqAndDeletedFalseOrderBySortOrder(branch.getSeq());
            assertThat(persisted).extracting(ComplexClass::getName)
                    .as("자리바꿈 결과가 sortOrder 기준으로 영속")
                    .containsExactly("C반", "B반", "A반");
        }

        @Test
        @DisplayName("분반 자리바꿈 후 각 분반의 sortOrder 값이 DB 에 정확히 저장된다")
        void 분반_자리바꿈_sortOrder_값_검증() {
            ComplexClass a = newClass("A반", 0);
            ComplexClass b = newClass("B반", 1);

            ClassReorderRequest req = new ClassReorderRequest();
            req.setClassOrders(List.of(
                    classOrder(b.getSeq(), 0),
                    classOrder(a.getSeq(), 1)
            ));
            attendanceService.reorderClasses(req);
            em.flush();
            em.clear();

            ComplexClass reloadedA = classRepository.findById(a.getSeq()).orElseThrow();
            ComplexClass reloadedB = classRepository.findById(b.getSeq()).orElseThrow();
            assertThat(reloadedB.getSortOrder()).isEqualTo(0);
            assertThat(reloadedA.getSortOrder()).isEqualTo(1);
        }
    }

    @Nested
    class 회원_순서_자리바꿈 {

        @Test
        @DisplayName("분반 안에서 첫 회원과 마지막 회원을 자리바꿈하면 가운데 회원은 그대로 영속된다")
        void 회원_첫_마지막_자리바꿈_영속성() {
            ComplexClass clazz = newClass("요가", 0);
            ComplexMember m1 = newMember("첫번째");
            ComplexMember m2 = newMember("두번째");
            ComplexMember m3 = newMember("세번째");
            attach(m1, clazz, 0);
            attach(m2, clazz, 1);
            attach(m3, clazz, 2);

            // m1 ↔ m3 자리바꿈
            MemberReorderRequest req = new MemberReorderRequest();
            req.setClassSeq(clazz.getSeq());
            req.setMemberOrders(List.of(
                    memberOrder(m3.getSeq(), 0),
                    memberOrder(m2.getSeq(), 1),
                    memberOrder(m1.getSeq(), 2)
            ));
            attendanceService.reorderMembers(req, branch.getSeq());
            em.flush();
            em.clear();

            List<ComplexMemberClassMapping> persisted =
                    mappingRepository.findByComplexClassSeqWithMember(clazz.getSeq());
            assertThat(persisted).extracting(m -> m.getMember().getName())
                    .as("회원 자리바꿈 결과가 sortOrder 기준으로 영속")
                    .containsExactly("세번째", "두번째", "첫번째");
        }

        @Test
        @DisplayName("회원 자리바꿈 후 각 매핑의 sortOrder 값이 DB 에 정확히 저장된다")
        void 회원_자리바꿈_sortOrder_값_검증() {
            ComplexClass clazz = newClass("요가", 0);
            ComplexMember m1 = newMember("알파");
            ComplexMember m2 = newMember("베타");
            ComplexMemberClassMapping a = attach(m1, clazz, 0);
            ComplexMemberClassMapping b = attach(m2, clazz, 1);

            MemberReorderRequest req = new MemberReorderRequest();
            req.setClassSeq(clazz.getSeq());
            req.setMemberOrders(List.of(
                    memberOrder(m2.getSeq(), 0),
                    memberOrder(m1.getSeq(), 1)
            ));
            attendanceService.reorderMembers(req, branch.getSeq());
            em.flush();
            em.clear();

            ComplexMemberClassMapping reloadedA = mappingRepository.findById(a.getSeq()).orElseThrow();
            ComplexMemberClassMapping reloadedB = mappingRepository.findById(b.getSeq()).orElseThrow();
            assertThat(reloadedB.getSortOrder()).isEqualTo(0);
            assertThat(reloadedA.getSortOrder()).isEqualTo(1);
        }
    }
}
