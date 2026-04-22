package com.culcom.service;

import com.culcom.dto.complex.member.ComplexMemberMembershipResponse;
import com.culcom.dto.complex.member.MembershipChangeRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.product.Membership;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.MembershipRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 멤버십 변경 이후 불변식 검증:
 *   "회원에게 활성(active) 상태의 일반 멤버십은 정확히 1개만 남는다."
 *
 * 시나리오별로 확인:
 *  1) 원본 1개 활성 → 변경 → 새 1개 활성 (원본은 '변경')
 *  2) 내부(스태프 복지) 멤버십과 일반 멤버십이 혼재해도 일반 활성은 1개만 남아야 함
 *  3) 변경 여러 번 연속해도 최신 하나만 활성
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MemberMembershipServiceSingleActiveTest {

    @Autowired MemberMembershipService memberMembershipService;
    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;

    private Branch branch;
    private ComplexMember member;
    private Membership p10;   // 10회권
    private Membership p20;   // 20회권
    private Membership p30;   // 30회권
    private ComplexMemberMembership firstActive;

    @BeforeEach
    void setUp() {
        branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-single-active-" + System.nanoTime())
                .build());

        p10 = membershipRepository.save(Membership.builder()
                .name("10회권").duration(60).count(10).price(150_000).build());
        p20 = membershipRepository.save(Membership.builder()
                .name("20회권").duration(90).count(20).price(280_000).build());
        p30 = membershipRepository.save(Membership.builder()
                .name("30회권").duration(120).count(30).price(400_000).build());

        member = memberRepository.save(ComplexMember.builder()
                .name("회원").phoneNumber("010" + (System.nanoTime() % 100000000L))
                .branch(branch).build());

        firstActive = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(p10)
                .startDate(LocalDate.now().minusDays(10))
                .expiryDate(LocalDate.now().plusDays(50))
                .totalCount(10).usedCount(3)
                .price("150000")
                .status(MembershipStatus.활성)
                .build());
    }

    @Test
    @DisplayName("멤버십 변경 후 일반 활성 멤버십은 정확히 1개(새 것) 뿐이다")
    void 변경_후_활성은_오직_새_멤버십() {
        MembershipChangeRequest req = new MembershipChangeRequest();
        setField(req, "newMembershipSeq", p20.getSeq());

        ComplexMemberMembershipResponse created =
                memberMembershipService.changeMembership(member.getSeq(), firstActive.getSeq(), req);

        // 일반(비-internal) 활성 멤버십을 통째로 조회해 정확히 1개인지 확인
        List<ComplexMemberMembership> active = memberMembershipRepository
                .findByMemberSeqAndInternalFalse(member.getSeq()).stream()
                .filter(mm -> mm.getStatus() == MembershipStatus.활성)
                .toList();

        assertThat(active)
                .as("변경 이후 활성 상태의 일반 멤버십은 정확히 1개여야 한다")
                .hasSize(1);
        assertThat(active.get(0).getSeq())
                .as("유일한 활성 멤버십은 새로 생성된 것(target)이어야 한다")
                .isEqualTo(created.getSeq());
        assertThat(active.get(0).getMembership().getSeq()).isEqualTo(p20.getSeq());

        // 원본은 '변경' 상태
        ComplexMemberMembership reloaded = memberMembershipRepository.findById(firstActive.getSeq()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(MembershipStatus.변경);
    }

    @Test
    @DisplayName("내부(스태프 복지) 활성 멤버십이 함께 있어도 일반 활성은 1개만 유지")
    void 내부멤버십과_혼재해도_일반활성은_1개() {
        // internal=true 로 활성 상태를 하나 추가 (스태프 복지 멤버십)
        memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(p10)
                .startDate(LocalDate.now().minusDays(5))
                .expiryDate(LocalDate.now().plusDays(365))
                .totalCount(999999).usedCount(0)
                .price("0")
                .status(MembershipStatus.활성)
                .internal(true)
                .build());

        MembershipChangeRequest req = new MembershipChangeRequest();
        setField(req, "newMembershipSeq", p30.getSeq());

        memberMembershipService.changeMembership(member.getSeq(), firstActive.getSeq(), req);

        // 일반 활성은 1개, 내부 활성은 여전히 존재
        List<ComplexMemberMembership> externalActive = memberMembershipRepository
                .findByMemberSeqAndInternalFalse(member.getSeq()).stream()
                .filter(mm -> mm.getStatus() == MembershipStatus.활성)
                .toList();
        assertThat(externalActive)
                .as("일반 활성 멤버십은 내부 멤버십과 무관하게 정확히 1개여야 한다")
                .hasSize(1);

        List<ComplexMemberMembership> internalActive =
                memberMembershipRepository.findByMemberSeqAndInternalTrue(member.getSeq()).stream()
                        .filter(mm -> mm.getStatus() == MembershipStatus.활성)
                        .toList();
        assertThat(internalActive)
                .as("내부 멤버십은 변경의 영향을 받지 않는다")
                .hasSize(1);
    }

    @Test
    @DisplayName("연속 변경 시에도 항상 마지막 1개만 활성으로 남는다")
    void 연속_변경해도_활성은_항상_1개() {
        // 1차 변경: p10 → p20
        MembershipChangeRequest req1 = new MembershipChangeRequest();
        setField(req1, "newMembershipSeq", p20.getSeq());
        ComplexMemberMembershipResponse first =
                memberMembershipService.changeMembership(member.getSeq(), firstActive.getSeq(), req1);

        // 2차 변경: p20 → p30
        MembershipChangeRequest req2 = new MembershipChangeRequest();
        setField(req2, "newMembershipSeq", p30.getSeq());
        ComplexMemberMembershipResponse second =
                memberMembershipService.changeMembership(member.getSeq(), first.getSeq(), req2);

        List<ComplexMemberMembership> active = memberMembershipRepository
                .findByMemberSeqAndInternalFalse(member.getSeq()).stream()
                .filter(mm -> mm.getStatus() == MembershipStatus.활성)
                .toList();

        assertThat(active)
                .as("2회 연속 변경 후에도 활성 멤버십은 정확히 1개여야 한다")
                .hasSize(1);
        assertThat(active.get(0).getSeq())
                .as("가장 최근에 생성된 target 만 활성으로 남아야 한다")
                .isEqualTo(second.getSeq());

        // 이전 2개는 모두 '변경' 상태
        assertThat(memberMembershipRepository.findById(firstActive.getSeq()).orElseThrow().getStatus())
                .isEqualTo(MembershipStatus.변경);
        assertThat(memberMembershipRepository.findById(first.getSeq()).orElseThrow().getStatus())
                .isEqualTo(MembershipStatus.변경);
    }

    @Test
    @DisplayName("existsActiveByMemberSeq 와 findActiveByMemberSeqIn 도 동일하게 1건을 반환한다")
    void 쿼리_레벨에서도_활성_1개() {
        MembershipChangeRequest req = new MembershipChangeRequest();
        setField(req, "newMembershipSeq", p20.getSeq());
        memberMembershipService.changeMembership(member.getSeq(), firstActive.getSeq(), req);

        assertThat(memberMembershipRepository.existsActiveByMemberSeq(member.getSeq()))
                .as("단일 활성 멤버십이 존재해야 한다").isTrue();

        List<ComplexMemberMembership> active =
                memberMembershipRepository.findActiveByMemberSeqIn(List.of(member.getSeq()));
        assertThat(active)
                .as("findActiveByMemberSeqIn 결과도 정확히 1개여야 한다")
                .hasSize(1);
    }

    /** MembershipChangeRequest 가 setter를 노출하지 않아 리플렉션으로 주입 */
    private static void setField(Object target, String name, Object value) {
        try {
            Field f = target.getClass().getDeclaredField(name);
            f.setAccessible(true);
            f.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
