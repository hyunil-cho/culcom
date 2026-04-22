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
    @Autowired MembershipPaymentRepository paymentRepository;

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

        // given — 양도 요청 생성 (관리자 확인 완료된 상태로)
        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(originalMm)
                .fromMember(fromMember)
                .branch(branch)
                .transferFee(50000)
                .remainingCount(99)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(TransferStatus.확인)
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
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(TransferStatus.확인).build());

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
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(TransferStatus.확인).build());

        assertThatThrownBy(() -> transferService.completeTransfer(tr.getSeq(), toMember.getSeq()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("사용할 수 없는 멤버십");
    }

    @Test
    void 양도_완료시_양수자_멤버십의_핵심_필드가_올바르게_세팅된다() {
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
        // 완납 처리 (미수금 가드에 걸리지 않도록)
        paymentRepository.save(com.culcom.entity.complex.member.MembershipPayment.builder()
                .memberMembership(originalMm).amount(400_000L)
                .paidDate(paymentAt).method("카드")
                .kind(com.culcom.entity.enums.PaymentKind.BALANCE).build());

        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(originalMm).fromMember(fromMember).branch(branch)
                .transferFee(30000).remainingCount(43)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(TransferStatus.확인).build());

        transferService.completeTransfer(tr.getSeq(), toMember.getSeq());

        ComplexMemberMembership newMm = memberMembershipRepository
                .findByMemberSeqAndInternalFalse(toMember.getSeq()).get(0);
        // 기간/잔여/연기 횟수 등 "멤버십 사용권" 관련 필드는 그대로 이전
        assertThat(newMm.getStartDate()).as("시작일 이전").isEqualTo(start);
        assertThat(newMm.getPostponeTotal()).as("연기 가능 횟수 이전").isEqualTo(5);
        assertThat(newMm.getPostponeUsed()).as("연기 사용 횟수 이전").isEqualTo(2);

        // 가격은 원본 정가가 아닌 '양도비' 기준이어야 한다 — 양수자가 지불한 금액만 기록
        assertThat(newMm.getPrice()).as("가격은 양도비만 기록되어야 함").isEqualTo("30000");

        // 원본 결제수단/결제일은 복사되지 않아야 한다 — 양수자 측 결제는 완료 시점에 별도 기록됨
        assertThat(newMm.getPaymentMethod()).as("원본 결제수단이 양수자에게 복사되면 안 됨").isNull();
        assertThat(newMm.getPaymentDate()).as("원본 결제일이 양수자에게 복사되면 안 됨").isNull();

        // 양수자 멤버십이 원본과 연결되어 있어야 함 (유래 추적)
        assertThat(newMm.getChangedFromSeq()).as("원본 멤버십 seq 링크").isEqualTo(originalMm.getSeq());
        assertThat(newMm.getChangeFee()).as("지불한 양도비 기록").isEqualTo(30_000L);
    }

    @Test
    void 양도_완료시_요청에_담긴_결제수단_결제일이_납부기록에_반영된다() {
        // 관리자가 양수자의 양도비 결제수단/시각을 입력하면, 그 값이 양수자 멤버십의 납부 기록에 그대로 들어가야 한다.
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-pm-" + System.nanoTime()).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("상품").duration(90).count(30).price(300_000).transferable(true).build());
        ComplexMember fromMember = memberRepository.save(ComplexMember.builder()
                .name("양도자").phoneNumber("01010000021").branch(branch).build());
        ComplexMember toMember = memberRepository.save(ComplexMember.builder()
                .name("양수자").phoneNumber("01010000022").branch(branch).build());
        ComplexMemberMembership originalMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(fromMember).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30).usedCount(0)
                .price("300000").status(MembershipStatus.활성).build());
        paymentRepository.save(com.culcom.entity.complex.member.MembershipPayment.builder()
                .memberMembership(originalMm).amount(300_000L)
                .paidDate(LocalDateTime.now()).method("카드")
                .kind(com.culcom.entity.enums.PaymentKind.BALANCE).build());

        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(originalMm).fromMember(fromMember).branch(branch)
                .transferFee(30_000).remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(TransferStatus.확인).build());

        LocalDateTime paidAt = LocalDateTime.of(2026, 4, 22, 15, 30);
        com.culcom.dto.transfer.TransferCompleteRequest req = new com.culcom.dto.transfer.TransferCompleteRequest();
        req.setPaymentMethod("현금");
        req.setPaymentDate(paidAt);

        transferService.completeTransfer(tr.getSeq(), toMember.getSeq(), req);

        ComplexMemberMembership newMm = memberMembershipRepository
                .findByMemberSeqAndInternalFalse(toMember.getSeq()).get(0);
        java.util.List<com.culcom.entity.complex.member.MembershipPayment> payments =
                paymentRepository.findByMemberMembershipSeqOrderByPaidDateAscSeqAsc(newMm.getSeq());

        assertThat(payments).hasSize(1);
        com.culcom.entity.complex.member.MembershipPayment p = payments.get(0);
        assertThat(p.getMethod()).as("요청의 결제수단이 납부기록에 반영").isEqualTo("현금");
        assertThat(p.getPaidDate()).as("요청의 결제일이 납부기록에 반영").isEqualTo(paidAt);
        assertThat(p.getAmount()).as("납부 금액 = 양도비").isEqualTo(30_000L);

        // 양수자 멤버십 자체의 paymentMethod/paymentDate 에도 반영됨
        assertThat(newMm.getPaymentMethod()).isEqualTo("현금");
        assertThat(newMm.getPaymentDate()).isEqualTo(paidAt);
    }

    @Test
    void 양도_완료시_카드결제이면_카드상세가_납부기록에_저장된다() {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-card-" + System.nanoTime()).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("상품").duration(90).count(30).price(300_000).transferable(true).build());
        ComplexMember fromMember = memberRepository.save(ComplexMember.builder()
                .name("양도자").phoneNumber("01010000031").branch(branch).build());
        ComplexMember toMember = memberRepository.save(ComplexMember.builder()
                .name("양수자").phoneNumber("01010000032").branch(branch).build());
        ComplexMemberMembership originalMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(fromMember).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30).usedCount(0)
                .price("300000").status(MembershipStatus.활성).build());
        paymentRepository.save(com.culcom.entity.complex.member.MembershipPayment.builder()
                .memberMembership(originalMm).amount(300_000L)
                .paidDate(LocalDateTime.now()).method("카드")
                .kind(com.culcom.entity.enums.PaymentKind.BALANCE).build());

        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(originalMm).fromMember(fromMember).branch(branch)
                .transferFee(30_000).remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(TransferStatus.확인).build());

        com.culcom.dto.complex.member.CardPaymentDetailDto cardDto =
                com.culcom.dto.complex.member.CardPaymentDetailDto.builder()
                        .cardCompany("삼성").cardNumber("12345678")
                        .cardApprovalDate(LocalDate.of(2026, 4, 22))
                        .cardApprovalNumber("A12345").build();
        com.culcom.dto.transfer.TransferCompleteRequest req = new com.culcom.dto.transfer.TransferCompleteRequest();
        req.setPaymentMethod("카드");
        req.setCardDetail(cardDto);

        transferService.completeTransfer(tr.getSeq(), toMember.getSeq(), req);

        ComplexMemberMembership newMm = memberMembershipRepository
                .findByMemberSeqAndInternalFalse(toMember.getSeq()).get(0);
        java.util.List<com.culcom.entity.complex.member.MembershipPayment> payments =
                paymentRepository.findByMemberMembershipSeqOrderByPaidDateAscSeqAsc(newMm.getSeq());
        assertThat(payments).hasSize(1);
        com.culcom.entity.complex.member.MembershipPayment p = payments.get(0);
        assertThat(p.getMethod()).isEqualTo("카드");

        com.culcom.entity.complex.member.CardPaymentDetail card = p.getCardPaymentDetail();
        assertThat(card).as("카드 결제 시 카드 상세가 납부기록에 저장되어야 함").isNotNull();
        assertThat(card.getCardCompany()).isEqualTo("삼성");
        assertThat(card.getCardNumber()).isEqualTo("12345678");
        assertThat(card.getCardApprovalDate()).isEqualTo(LocalDate.of(2026, 4, 22));
        assertThat(card.getCardApprovalNumber()).isEqualTo("A12345");
    }

    @Test
    void 양도_완료시_카드결제인데_카드상세가_없으면_거부된다() {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-nocard-" + System.nanoTime()).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("상품").duration(90).count(30).price(300_000).transferable(true).build());
        ComplexMember fromMember = memberRepository.save(ComplexMember.builder()
                .name("양도자").phoneNumber("01010000041").branch(branch).build());
        ComplexMember toMember = memberRepository.save(ComplexMember.builder()
                .name("양수자").phoneNumber("01010000042").branch(branch).build());
        ComplexMemberMembership originalMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(fromMember).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30).usedCount(0)
                .price("300000").status(MembershipStatus.활성).build());
        paymentRepository.save(com.culcom.entity.complex.member.MembershipPayment.builder()
                .memberMembership(originalMm).amount(300_000L)
                .paidDate(LocalDateTime.now()).method("카드")
                .kind(com.culcom.entity.enums.PaymentKind.BALANCE).build());

        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(originalMm).fromMember(fromMember).branch(branch)
                .transferFee(30_000).remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(TransferStatus.확인).build());

        com.culcom.dto.transfer.TransferCompleteRequest req = new com.culcom.dto.transfer.TransferCompleteRequest();
        req.setPaymentMethod("카드");
        // cardDetail 누락

        assertThatThrownBy(() -> transferService.completeTransfer(tr.getSeq(), toMember.getSeq(), req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("카드");
    }

    @Test
    void 양도_완료시_결제수단_미지정이면_납부기록의_method는_null이다() {
        // 2-arg 기본 오버로드(기존 테스트/기존 호출부 호환) — 결제 정보가 없으면 납부기록의 method 는 null.
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-nopm-" + System.nanoTime()).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("상품").duration(90).count(30).price(300_000).transferable(true).build());
        ComplexMember fromMember = memberRepository.save(ComplexMember.builder()
                .name("양도자").phoneNumber("01010000051").branch(branch).build());
        ComplexMember toMember = memberRepository.save(ComplexMember.builder()
                .name("양수자").phoneNumber("01010000052").branch(branch).build());
        ComplexMemberMembership originalMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(fromMember).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30).usedCount(0)
                .price("300000").status(MembershipStatus.활성).build());
        paymentRepository.save(com.culcom.entity.complex.member.MembershipPayment.builder()
                .memberMembership(originalMm).amount(300_000L)
                .paidDate(LocalDateTime.now()).method("카드")
                .kind(com.culcom.entity.enums.PaymentKind.BALANCE).build());

        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(originalMm).fromMember(fromMember).branch(branch)
                .transferFee(30_000).remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(TransferStatus.확인).build());

        transferService.completeTransfer(tr.getSeq(), toMember.getSeq());

        ComplexMemberMembership newMm = memberMembershipRepository
                .findByMemberSeqAndInternalFalse(toMember.getSeq()).get(0);
        java.util.List<com.culcom.entity.complex.member.MembershipPayment> payments =
                paymentRepository.findByMemberMembershipSeqOrderByPaidDateAscSeqAsc(newMm.getSeq());
        assertThat(payments).hasSize(1);
        assertThat(payments.get(0).getMethod()).isNull();
        assertThat(payments.get(0).getAmount()).isEqualTo(30_000L);
    }

    @Test
    void 양도_완료시_양수자_멤버십의_미수금은_0원이어야_한다() {
        // 버그 방지 회귀 테스트.
        // 기존엔 양수자 멤버십에 원본 정가(예: 300,000원)가 복사되고, 결제 기록은 원본에 귀속되어
        // 양수자는 '정가 전액 미수금'으로 잘못 표시되는 문제가 있었다.
        // 수정 후엔 price=양도비, 양도비 납부 기록이 양수자 멤버십에 귀속되어 미수금이 0이어야 한다.
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-unpaid-" + System.nanoTime()).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("상품").duration(90).count(30).price(300_000).transferable(true).build());
        ComplexMember fromMember = memberRepository.save(ComplexMember.builder()
                .name("양도자").phoneNumber("01010000011").branch(branch).build());
        ComplexMember toMember = memberRepository.save(ComplexMember.builder()
                .name("양수자").phoneNumber("01010000012").branch(branch).build());
        ComplexMemberMembership originalMm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(fromMember).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30).usedCount(0)
                .price("300000").status(MembershipStatus.활성).build());
        paymentRepository.save(com.culcom.entity.complex.member.MembershipPayment.builder()
                .memberMembership(originalMm).amount(300_000L)
                .paidDate(LocalDateTime.now()).method("카드")
                .kind(com.culcom.entity.enums.PaymentKind.BALANCE).build());

        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(originalMm).fromMember(fromMember).branch(branch)
                .transferFee(30_000).remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(TransferStatus.확인).build());

        transferService.completeTransfer(tr.getSeq(), toMember.getSeq());

        ComplexMemberMembership newMm = memberMembershipRepository
                .findByMemberSeqAndInternalFalse(toMember.getSeq()).get(0);
        long paid = paymentRepository.sumAmountByMemberMembershipSeq(newMm.getSeq());
        long price = Long.parseLong(newMm.getPrice());

        assertThat(paid).as("양수자 멤버십 납부 합계는 양도비와 같아야 한다").isEqualTo(30_000L);
        assertThat(price).as("양수자 멤버십 price 는 양도비와 같아야 한다").isEqualTo(30_000L);
        assertThat(paid - price).as("양수자 미수금은 0이어야 한다").isZero();
    }

    @Test
    void 관리자_확인을_받지_않은_양도요청은_회원에_연결할_수_없다() {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-notconfirmed-" + System.nanoTime()).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("상품").duration(90).count(30).price(300000).transferable(true).build());
        ComplexMember fromMember = memberRepository.save(ComplexMember.builder()
                .name("양도자").phoneNumber("01011111111").branch(branch).build());
        ComplexMember toMember = memberRepository.save(ComplexMember.builder()
                .name("양수자").phoneNumber("01022222222").branch(branch).build());
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(fromMember).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30).usedCount(0).status(MembershipStatus.활성).build());
        // status = 접수 — 양수자 정보는 제출됐지만 관리자 확인 전
        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(mm).fromMember(fromMember).branch(branch)
                .transferFee(20000).remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(TransferStatus.접수).build());

        assertThatThrownBy(() -> transferService.completeTransfer(tr.getSeq(), toMember.getSeq()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("관리자 확인");
    }

    @Test
    void 이미_사용된_양도요청은_재사용할_수_없다() {
        Branch branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("test-reuse-" + System.nanoTime()).build());
        Membership product = membershipRepository.save(Membership.builder()
                .name("상품").duration(90).count(30).price(300000).transferable(true).build());
        ComplexMember fromMember = memberRepository.save(ComplexMember.builder()
                .name("양도자").phoneNumber("01011111111").branch(branch).build());
        ComplexMember toMember = memberRepository.save(ComplexMember.builder()
                .name("양수자").phoneNumber("01022222222").branch(branch).build());
        ComplexMemberMembership mm = memberMembershipRepository.save(ComplexMemberMembership.builder()
                .member(fromMember).membership(product)
                .startDate(LocalDate.now()).expiryDate(LocalDate.now().plusDays(90))
                .totalCount(30).usedCount(0).status(MembershipStatus.활성).build());
        TransferRequest tr = transferRequestRepository.save(TransferRequest.builder()
                .memberMembership(mm).fromMember(fromMember).branch(branch)
                .transferFee(20000).remainingCount(30)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(TransferStatus.확인).referenced(true).build());

        assertThatThrownBy(() -> transferService.completeTransfer(tr.getSeq(), toMember.getSeq()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 사용된");
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
                .token(UUID.randomUUID().toString().replace("-", ""))
                .status(TransferStatus.확인).build());

        assertThatThrownBy(() -> transferService.completeTransfer(tr.getSeq(), 9_999_999L))
                .isInstanceOf(EntityNotFoundException.class);
    }
}
