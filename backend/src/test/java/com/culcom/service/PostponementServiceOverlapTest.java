package com.culcom.service;

import com.culcom.dto.complex.postponement.PostponementCreateRequest;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.entity.product.Membership;
import com.culcom.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 같은 멤버십에 대해 이미 승인된 연기 기간과 새 연기 신청의 기간이 겹치는 경우
 * 신규 신청이 거부되어야 한다는 시나리오.
 *
 * 프로젝트 주석(ComplexMemberMembership.java:62-65)에서 "오늘 연기 중인지는
 * complex_postponement_requests에서 기간으로 판정한다"고 명시하므로
 * 기간이 겹친 승인 레코드 2건이 공존하는 상태는 의미상 잘못된 상태.
 *
 * 경계:
 *  - 완전 동일 구간
 *  - 기존 구간 앞쪽 일부 걸침
 *  - 기존 구간 뒤쪽 일부 걸침
 *  - 기존 구간 완전 포함
 *  - 정확히 맞닿은 경우(end == new.start) — 허용해야 한다고 가정
 *  - 반려(반려 상태)된 기존 요청과는 겹쳐도 허용되어야 한다
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PostponementServiceOverlapTest {

    @Autowired PostponementService postponementService;
    @Autowired BranchRepository branchRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexPostponementRequestRepository postponementRepository;

    private Fixture setup(String suffix) {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-postpone-overlap-" + suffix + "-" + System.nanoTime())
                .build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("3개월권").duration(90).count(30).price(300_000).build());
        ComplexMember member = memberRepository.save(ComplexMember.builder()
                .name("홍길동").phoneNumber("01040000" + Math.abs(suffix.hashCode() % 1000))
                .branch(branch).build());
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(member).membership(product)
                .startDate(LocalDate.now().minusDays(5))
                .expiryDate(LocalDate.now().plusDays(85))
                .totalCount(30).usedCount(0)
                .postponeTotal(5).postponeUsed(0)  // 횟수 제한 영향 배제
                .price("300000")
                .status(MembershipStatus.활성)
                .build());
        return new Fixture(branch, member, mm);
    }

    /** 기존의 "승인된" 연기 기록을 저장소에 직접 넣어 선행 상태 구성. */
    private void seedApproved(Fixture f, LocalDate start, LocalDate end) {
        postponementRepository.save(ComplexPostponementRequest.builder()
                .branch(f.branch).member(f.member).memberMembership(f.mm)
                .memberName(f.member.getName()).phoneNumber(f.member.getPhoneNumber())
                .startDate(start).endDate(end).reason("사전 연기")
                .status(RequestStatus.승인)
                .build());
    }

    private PostponementCreateRequest req(Fixture f, LocalDate start, LocalDate end) {
        PostponementCreateRequest r = new PostponementCreateRequest();
        r.setMemberSeq(f.member.getSeq());
        r.setMemberMembershipSeq(f.mm.getSeq());
        r.setMemberName(f.member.getName());
        r.setPhoneNumber(f.member.getPhoneNumber());
        r.setStartDate(start);
        r.setEndDate(end);
        r.setReason("새 연기");
        return r;
    }

    @Test
    void 완전_동일_구간은_거부되어야_한다() {
        Fixture f = setup("same");
        LocalDate s = LocalDate.now().plusDays(10);
        LocalDate e = LocalDate.now().plusDays(20);
        seedApproved(f, s, e);

        assertThatThrownBy(() -> postponementService.create(req(f, s, e), f.branch.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 앞쪽_걸침_구간은_거부되어야_한다() {
        Fixture f = setup("front");
        // 기존: [10, 20]
        seedApproved(f, LocalDate.now().plusDays(10), LocalDate.now().plusDays(20));
        // 새: [5, 12] — 앞쪽 걸침
        assertThatThrownBy(() -> postponementService.create(
                req(f, LocalDate.now().plusDays(5), LocalDate.now().plusDays(12)), f.branch.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 뒤쪽_걸침_구간은_거부되어야_한다() {
        Fixture f = setup("back");
        // 기존: [10, 20]
        seedApproved(f, LocalDate.now().plusDays(10), LocalDate.now().plusDays(20));
        // 새: [18, 25] — 뒤쪽 걸침
        assertThatThrownBy(() -> postponementService.create(
                req(f, LocalDate.now().plusDays(18), LocalDate.now().plusDays(25)), f.branch.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 완전_포함_구간은_거부되어야_한다() {
        Fixture f = setup("inner");
        // 기존: [10, 30]
        seedApproved(f, LocalDate.now().plusDays(10), LocalDate.now().plusDays(30));
        // 새: [15, 20] — 기존 내부
        assertThatThrownBy(() -> postponementService.create(
                req(f, LocalDate.now().plusDays(15), LocalDate.now().plusDays(20)), f.branch.getSeq()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 맞닿은_구간_다음날_시작은_허용된다() {
        Fixture f = setup("touch");
        // 기존: [10, 20]
        seedApproved(f, LocalDate.now().plusDays(10), LocalDate.now().plusDays(20));
        // 새: [21, 30] — 기존 end 다음 날 시작 (겹치지 않음)
        assertThatCode(() -> postponementService.create(
                req(f, LocalDate.now().plusDays(21), LocalDate.now().plusDays(30)), f.branch.getSeq()))
                .doesNotThrowAnyException();
    }

    @Test
    void 반려된_기존_연기와_겹쳐도_새_신청은_허용된다() {
        Fixture f = setup("rejected");
        // 반려된 연기
        postponementRepository.save(ComplexPostponementRequest.builder()
                .branch(f.branch).member(f.member).memberMembership(f.mm)
                .memberName(f.member.getName()).phoneNumber(f.member.getPhoneNumber())
                .startDate(LocalDate.now().plusDays(10)).endDate(LocalDate.now().plusDays(20))
                .reason("이전 요청").status(RequestStatus.반려).rejectReason("임의")
                .build());
        // 같은 구간으로 새 신청 — 반려는 확정 이력이 아니므로 허용되어야 한다
        assertThatCode(() -> postponementService.create(
                req(f, LocalDate.now().plusDays(10), LocalDate.now().plusDays(20)), f.branch.getSeq()))
                .doesNotThrowAnyException();
    }

    private record Fixture(Branch branch, ComplexMember member, ComplexMemberMembership mm) {}
}
