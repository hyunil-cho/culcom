package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ClassTimeSlot;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberClassMapping;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.TransferStatus;
import com.culcom.entity.product.Membership;
import com.culcom.entity.transfer.TransferRequest;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 양도 완료 시나리오:
 * 1) 양도자가 멤버십에 가입 후 수업 1회 수강 (usedCount=1)
 * 2) 양도 요청 생성
 * 3) 양수자(신규 회원) 등록 후 completeTransfer 호출
 *
 * 검증:
 * - 양도자의 멤버십 상태가 만료로 변경
 * - 양도자의 수업 배정이 모두 해제
 * - 양수자에게 동일한 멤버십이 생성 (totalCount, usedCount, expiryDate 동일)
 * - 양수자 멤버십의 transferred = true (재양도 불가)
 * - 양수자 멤버십 상태 = 활성
 * - 양도 요청 상태 = 확인
 * - 양도자의 활성 멤버십이 없음
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TransferServiceCompleteTest {

    @Autowired TransferService transferService;
    @Autowired BranchRepository branchRepository;
    @Autowired ClassTimeSlotRepository classTimeSlotRepository;
    @Autowired ComplexClassRepository classRepository;
    @Autowired MembershipRepository membershipRepository;
    @Autowired ComplexMemberRepository memberRepository;
    @Autowired ComplexMemberMembershipRepository memberMembershipRepository;
    @Autowired ComplexMemberClassMappingRepository classMappingRepository;
    @Autowired TransferRequestRepository transferRequestRepository;

    @Test
    void 양도_완료시_양도자_멤버십_만료_양수자에게_동일_멤버십_이전_수업_해제() {
        // given — 지점, 수업, 멤버십 상품 세팅
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점")
                .alias("test-transfer-" + System.nanoTime())
                .build());

        ClassTimeSlot slot = classTimeSlotRepository.save(ClassTimeSlot.builder()
                .branch(branch).name("월수금").daysOfWeek("MON,WED,FRI")
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .build());

        ComplexClass clazz = classRepository.save(ComplexClass.builder()
                .branch(branch).timeSlot(slot).name("영어A").capacity(10).sortOrder(0).build());

        Membership product = membershipRepository.save(Membership.builder()
                .name("프리미엄").duration(90).count(100).price(500000)
                .transferable(true).build());

        // given — 양도자: 멤버십 가입 + 수업 1회 수강 (usedCount=1) + 수업 배정
        ComplexMember fromMember = memberRepository.save(ComplexMember.builder()
                .name("양도자").phoneNumber("01011111111").branch(branch).build());

        ComplexMemberMembership originalMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(fromMember).membership(product)
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusDays(90))
                .totalCount(100).usedCount(1)
                .status(MembershipStatus.활성)
                .build());

        classMappingRepository.save(ComplexMemberClassMapping.builder()
                .member(fromMember).complexClass(clazz).sortOrder(0).build());

        // given — 양도 요청 생성
        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(originalMm)
                .fromMember(fromMember)
                .branch(branch)
                .transferFee(50000)
                .remainingCount(99)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .build());

        // given — 양수자(신규 회원) 등록
        ComplexMember toMember = memberRepository.save(ComplexMember.builder()
                .name("양수자").phoneNumber("01022222222").branch(branch).build());

        // 사전 검증
        assertThat(originalMm.getStatus()).isEqualTo(MembershipStatus.활성);
        assertThat(classMappingRepository.findByMemberSeq(fromMember.getSeq())).hasSize(1);

        // when — 양도 완료
        transferService.completeTransfer(tr.getSeq(), toMember.getSeq());

        // then — 양도자 멤버십 만료
        ComplexMemberMembership reloadedOriginal = memberMembershipRepository.findById(originalMm.getSeq()).orElseThrow();
        assertThat(reloadedOriginal.getStatus())
                .as("양도자 멤버십은 만료 상태여야 한다")
                .isEqualTo(MembershipStatus.만료);

        // then — 양도자 수업 배정 해제
        assertThat(classMappingRepository.findByMemberSeq(fromMember.getSeq()))
                .as("양도자의 수업 배정이 모두 해제되어야 한다")
                .isEmpty();

        // then — 양도자에게 활성 멤버십 없음
        assertThat(memberMembershipRepository.existsActiveByMemberSeq(fromMember.getSeq()))
                .as("양도자에게 활성 멤버십이 없어야 한다")
                .isFalse();

        // then — 양수자에게 새 멤버십 생성
        List<ComplexMemberMembership> toMemberships =
                memberMembershipRepository.findByMemberSeqAndInternalFalse(toMember.getSeq());
        assertThat(toMemberships).hasSize(1);

        ComplexMemberMembership newMm = toMemberships.get(0);
        assertThat(newMm.getStatus())
                .as("양수자 멤버십은 활성이어야 한다")
                .isEqualTo(MembershipStatus.활성);
        assertThat(newMm.getTotalCount())
                .as("총 횟수가 동일하게 이전되어야 한다")
                .isEqualTo(100);
        assertThat(newMm.getUsedCount())
                .as("사용 횟수가 동일하게 이전되어야 한다 (1회 사용)")
                .isEqualTo(1);
        assertThat(newMm.getExpiryDate())
                .as("만료일이 동일하게 이전되어야 한다")
                .isEqualTo(originalMm.getExpiryDate());
        assertThat(newMm.getTransferred())
                .as("양도받은 멤버십은 재양도 불가 표시가 되어야 한다")
                .isTrue();
        assertThat(newMm.getMembership().getSeq())
                .as("동일한 멤버십 상품이어야 한다")
                .isEqualTo(product.getSeq());

        // then — 양도 요청 상태 확인
        TransferRequest reloadedTr = transferRequestRepository.findById(tr.getSeq()).orElseThrow();
        assertThat(reloadedTr.getStatus())
                .as("양도 요청 상태가 확인이어야 한다")
                .isEqualTo(TransferStatus.확인);

        // then — 참조 완료 플래그(referenced=true)로 리스트 숨김 처리 가능해야 한다
        assertThat(reloadedTr.getReferenced())
                .as("완료된 양도 요청은 referenced=true로 표기되어야 한다")
                .isTrue();
    }

    @Test
    void 자기_자신에게는_양도를_완료할_수_없다() {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-self-" + System.nanoTime()).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("상품").duration(90).count(30).price(300000).transferable(true).build());
        ComplexMember fromMember = memberRepository.save(ComplexMember.builder()
                .name("본인").phoneNumber("01000000000").branch(branch).build());
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(fromMember).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30).usedCount(0).status(MembershipStatus.활성).build());
        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(mm).fromMember(fromMember).branch(branch)
                .transferFee(20000).remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", "")).build());

        assertThatThrownBy(() -> transferService.completeTransfer(tr.getSeq(), fromMember.getSeq()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("자기 자신");
    }

    @Test
    void 원본_멤버십이_비활성이면_양도를_완료할_수_없다() {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-inactive-" + System.nanoTime()).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("상품").duration(90).count(30).price(300000).transferable(true).build());
        ComplexMember fromMember = memberRepository.save(ComplexMember.builder()
                .name("양도자").phoneNumber("01011111111").branch(branch).build());
        ComplexMember toMember = memberRepository.save(ComplexMember.builder()
                .name("양수자").phoneNumber("01022222222").branch(branch).build());
        // 요청 생성 시점에는 활성이었으나, 완료 직전 환불되어 비활성 상태가 된 시나리오
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(fromMember).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30).usedCount(0).status(MembershipStatus.환불).build());
        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(mm).fromMember(fromMember).branch(branch)
                .transferFee(20000).remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", "")).build());

        assertThatThrownBy(() -> transferService.completeTransfer(tr.getSeq(), toMember.getSeq()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("사용할 수 없는 멤버십");
    }

    @Test
    void 양도_완료시_모든_핵심_필드가_양수자_멤버십으로_이전된다() {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-fields-" + System.nanoTime()).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("상품").duration(90).count(50).price(400000).transferable(true).build());
        ComplexMember fromMember = memberRepository.save(ComplexMember.builder()
                .name("양도자").phoneNumber("01011111111").branch(branch).build());
        ComplexMember toMember = memberRepository.save(ComplexMember.builder()
                .name("양수자").phoneNumber("01022222222").branch(branch).build());

        LocalDate start = LocalDate.now().minusDays(10);
        LocalDate expiry = LocalDate.now().plusDays(80);
        LocalDateTime paymentAt = LocalDateTime.now().minusDays(10).withNano(0);
        ComplexMemberMembership originalMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(fromMember).membership(product)
                .startDate(start).expiryDate(expiry)
                .totalCount(50).usedCount(7)
                .postponeTotal(5).postponeUsed(2)
                .price("400000").paymentMethod("카드").paymentDate(paymentAt)
                .status(MembershipStatus.활성).build());

        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(originalMm).fromMember(fromMember).branch(branch)
                .transferFee(30000).remainingCount(43)
                .token(UUID.randomUUID().toString().replace("-", "")).build());

        transferService.completeTransfer(tr.getSeq(), toMember.getSeq());

        ComplexMemberMembership newMm = memberMembershipRepository
                .findByMemberSeqAndInternalFalse(toMember.getSeq()).get(0);
        assertThat(newMm.getStartDate()).as("시작일 이전").isEqualTo(start);
        assertThat(newMm.getPostponeTotal()).as("연기 가능 횟수 이전").isEqualTo(5);
        assertThat(newMm.getPostponeUsed()).as("연기 사용 횟수 이전").isEqualTo(2);
        assertThat(newMm.getPrice()).as("가격 이전").isEqualTo("400000");
        assertThat(newMm.getPaymentMethod()).as("결제 수단 이전").isEqualTo("카드");
        assertThat(newMm.getPaymentDate()).as("결제일 이전").isEqualTo(paymentAt);
    }

    @Test
    void 존재하지_않는_양도요청은_완료할_수_없다() {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-notr-" + System.nanoTime()).build());
        ComplexMember toMember = memberRepository.save(ComplexMember.builder()
                .name("양수자").phoneNumber("01033333333").branch(branch).build());

        assertThatThrownBy(() -> transferService.completeTransfer(9_999_999L, toMember.getSeq()))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void 존재하지_않는_양수자_회원에게는_양도를_완료할_수_없다() {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-nomember-" + System.nanoTime()).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("상품").duration(90).count(30).price(300000).transferable(true).build());
        ComplexMember fromMember = memberRepository.save(ComplexMember.builder()
                .name("양도자").phoneNumber("01011111111").branch(branch).build());
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(fromMember).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30).usedCount(0).status(MembershipStatus.활성).build());
        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(mm).fromMember(fromMember).branch(branch)
                .transferFee(20000).remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", "")).build());

        assertThatThrownBy(() -> transferService.completeTransfer(tr.getSeq(), 9_999_999L))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
