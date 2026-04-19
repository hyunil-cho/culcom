package com.culcom.service;

import com.culcom.dto.complex.member.ComplexMemberMembershipRequest;
import com.culcom.dto.complex.member.ComplexMemberMembershipResponse;
import com.culcom.dto.complex.member.MembershipRequest;
import com.culcom.dto.complex.member.MembershipResponse;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.product.Membership;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.MembershipRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Membership soft delete 동작 검증.
 *
 * A. MembershipService 내부 CRUD는 soft delete를 적용한다:
 *   1) delete() 호출 시 실제 row는 남고 deleted=true 플래그만 세워진다
 *   2) 이후 list()에서 해당 멤버십이 제외된다
 *   3) 이후 get()은 EntityNotFoundException을 던진다
 *   4) 이후 update()도 EntityNotFoundException을 던진다 (삭제된 상품은 수정 불가)
 *
 * B. 외부 참조는 deleted 여부를 확인하지 않는다:
 *   5) MemberMembershipService.assignMembership(...)은 soft-deleted 멤버십으로도 정상 동작
 *      (기존 회원이 이미 보유한 멤버십의 상품 정의가 "상품 목록에서 숨김" 처리되었더라도
 *       회원 쪽 히스토리/결제/참조는 그대로 작동해야 함)
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MembershipSoftDeleteTest {

    @Autowired MembershipService membershipService;
    @Autowired MemberMembershipService memberMembershipService;
    @Autowired MembershipRepository membershipRepository;
    @Autowired BranchRepository branchRepository;
    @Autowired ComplexMemberRepository memberRepository;

    private MembershipResponse createProduct(String suffix) {
        MembershipRequest req = new MembershipRequest();
        req.setName("소프트삭제테스트-" + suffix + "-" + System.nanoTime());
        req.setDuration(90);
        req.setCount(30);
        req.setPrice(300_000);
        req.setTransferable(true);
        return membershipService.create(req);
    }

    // ── A. MembershipService 내부 CRUD ─────────────────────────────

    @Test
    void A1_delete는_row를_지우지_않고_deleted_플래그만_세운다() {
        MembershipResponse created = createProduct("A1");
        Long seq = created.getSeq();

        membershipService.delete(seq);

        // 하드 삭제가 아니라 row는 남아있어야 한다
        Membership raw = membershipRepository.findById(seq).orElse(null);
        assertThat(raw)
                .as("soft delete는 row를 물리적으로 제거하지 않는다")
                .isNotNull();
        assertThat(raw.getDeleted())
                .as("deleted 플래그가 true로 세워져야 한다")
                .isTrue();
    }

    @Test
    void A2_list는_deleted된_멤버십을_제외한다() {
        MembershipResponse keep = createProduct("A2-keep");
        MembershipResponse drop = createProduct("A2-drop");

        membershipService.delete(drop.getSeq());

        List<MembershipResponse> list = membershipService.list();
        List<Long> seqs = list.stream().map(MembershipResponse::getSeq).toList();

        assertThat(seqs).contains(keep.getSeq());
        assertThat(seqs)
                .as("soft-deleted 멤버십은 관리자 목록에서 보이지 않아야 한다")
                .doesNotContain(drop.getSeq());
    }

    @Test
    void A3_get은_deleted된_멤버십에_대해_EntityNotFoundException을_던진다() {
        MembershipResponse created = createProduct("A3");
        Long seq = created.getSeq();
        membershipService.delete(seq);

        assertThatThrownBy(() -> membershipService.get(seq))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void A4_update도_deleted된_멤버십에_대해_EntityNotFoundException을_던진다() {
        MembershipResponse created = createProduct("A4");
        Long seq = created.getSeq();
        membershipService.delete(seq);

        MembershipRequest edit = new MembershipRequest();
        edit.setName("수정시도-" + System.nanoTime());
        edit.setDuration(60);
        edit.setCount(20);
        edit.setPrice(200_000);
        edit.setTransferable(true);

        assertThatThrownBy(() -> membershipService.update(seq, edit))
                .as("soft-deleted 멤버십은 관리자 수정도 차단되어야 한다")
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── B. 외부 참조는 deleted 여부와 무관 ──────────────────────────

    @Test
    void B1_soft_deleted_멤버십도_회원에게_할당할_수_있다() {
        // 정책: "다른 곳에서 멤버십을 참조할 때는 deleted 여부를 확인하지 않고 그대로 쓴다."
        // 상품 목록에서는 감추지만, 이미 결정된 참조(seq 전달) 경로는 그대로 동작해야 한다.
        MembershipResponse product = createProduct("B1");
        Long membershipSeq = product.getSeq();

        membershipService.delete(membershipSeq);

        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("soft-del-B1-" + System.nanoTime())
                .build());
        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("양수자-B1").phoneNumber("01099990001").branch(branch).build());

        ComplexMemberMembershipRequest req = new ComplexMemberMembershipRequest();
        ReflectionTestUtils.setField(req, "membershipSeq", membershipSeq);
        ReflectionTestUtils.setField(req, "price", "300000");
        ReflectionTestUtils.setField(req, "paymentMethod", "현금");
        ReflectionTestUtils.setField(req, "status", MembershipStatus.활성);

        assertThatCode(() -> {
            ComplexMemberMembershipResponse res =
                    memberMembershipService.assignMembership(member.getSeq(), req);
            assertThat(res).isNotNull();
            assertThat(res.getMembershipName())
                    .as("참조한 상품의 이름이 그대로 응답에 포함되어야 한다")
                    .isEqualTo(product.getName());
        })
                .as("상품 정의가 soft-deleted 되었어도 회원 할당 경로는 정상 동작해야 한다")
                .doesNotThrowAnyException();
    }

    @Test
    void B2_repository_findById는_deleted_여부를_검사하지_않고_원본을_반환한다() {
        // 참조 경로들이 의존하는 기본 조회(findById)가 soft delete와 독립적인지 확인.
        MembershipResponse product = createProduct("B2");
        Long seq = product.getSeq();

        membershipService.delete(seq);

        Membership raw = membershipRepository.findById(seq).orElse(null);

        assertThat(raw).isNotNull();
        assertThat(raw.getDeleted()).isTrue();
        assertThat(raw.getName())
                .as("원본 상품 정보는 그대로 읽혀야 한다")
                .isEqualTo(product.getName());
    }
}
