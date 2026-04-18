package com.culcom.service;

import com.culcom.dto.complex.member.*;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.MembershipPayment;
import com.culcom.entity.product.Membership;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.ActivityFieldType;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.PaymentKind;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.MembershipPaymentRepository;
import com.culcom.repository.MembershipRepository;
import com.culcom.util.PriceUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class MemberMembershipService {

    private final ComplexMemberRepository memberRepository;
    private final MembershipRepository membershipRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final MembershipPaymentRepository paymentRepository;
    private final MemberClassService memberClassService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<ComplexMemberMembershipResponse> getMemberships(Long memberSeq) {
        return memberMembershipRepository.findByMemberSeqAndInternalFalse(memberSeq)
                .stream().map(mm -> ComplexMemberMembershipResponse.from(mm, true)).toList();
    }

    private static final String CARD_METHOD = "카드";

    private com.culcom.entity.complex.member.CardPaymentDetail resolveCardDetail(String method, CardPaymentDetailDto dto) {
        if (!CARD_METHOD.equals(method)) return null;
        if (dto == null) {
            throw new IllegalArgumentException("카드 결제 시 카드 상세 정보는 필수입니다.");
        }
        dto.validate();
        return dto.toEntity();
    }

    @Transactional
    public ComplexMemberMembershipResponse assignMembership(Long memberSeq, ComplexMemberMembershipRequest req) {
        ComplexMember member = memberRepository.findById(memberSeq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));
        Membership membership = membershipRepository.findById(req.getMembershipSeq())
                .orElseThrow(() -> new EntityNotFoundException("멤버십"));

        com.culcom.entity.complex.member.CardPaymentDetail cardDetail =
                resolveCardDetail(req.getPaymentMethod(), req.getCardDetail());

        LocalDate startDate = req.getStartDate() != null ? req.getStartDate() : LocalDate.now();
        LocalDate expiryDate = req.getExpiryDate() != null
                ? req.getExpiryDate() : startDate.plusDays(membership.getDuration());
        LocalDateTime paymentDate = req.getPaymentDate();

        MembershipStatus status = req.getStatus() != null ? req.getStatus() : MembershipStatus.활성;
        if (status == MembershipStatus.활성 && memberMembershipRepository.existsActiveByMemberSeq(memberSeq)) {
            throw new IllegalStateException("이미 활성화된 멤버십이 존재합니다");
        }

        ComplexMemberMembership mm = ComplexMemberMembership.builder()
                .member(member)
                .membership(membership)
                .startDate(startDate)
                .expiryDate(expiryDate)
                .totalCount(membership.getCount())
                .price(req.getPrice())
                .paymentMethod(req.getPaymentMethod())
                .paymentDate(paymentDate)
                .status(status)
                .build();

        if (member.getJoinDate() == null) {
            member.setJoinDate(startDate.atStartOfDay());
            memberRepository.save(member);
        }

        memberMembershipRepository.save(mm);

        // 첫 납부(디포짓) 자동 생성
        Long initialAmount = PriceUtils.parse(req.getDepositAmount());
        if (initialAmount != null && initialAmount > 0) {
            MembershipPayment first = MembershipPayment.builder()
                    .memberMembership(mm)
                    .amount(initialAmount)
                    .paidDate(paymentDate != null ? paymentDate : LocalDateTime.now())
                    .method(req.getPaymentMethod())
                    .kind(PaymentKind.DEPOSIT)
                    .note("멤버십 등록 시 첫 납부")
                    .cardPaymentDetail(cardDetail)
                    .build();
            mm.getPayments().add(first);
            memberMembershipRepository.save(mm);
        }

        eventPublisher.publishEvent(ActivityEvent.ofMembership(
                member, ActivityEventType.MEMBERSHIP_ASSIGN, mm.getSeq(),
                membership.getName() + " 멤버십 등록"));

        return ComplexMemberMembershipResponse.from(mm);
    }

    @Transactional
    public ComplexMemberMembershipResponse updateMembership(Long memberSeq, Long mmSeq, ComplexMemberMembershipRequest req) {
        ComplexMemberMembership mm = findOwnedMembership(memberSeq, mmSeq);

        if (req.getStartDate() != null) mm.setStartDate(req.getStartDate());
        if (req.getExpiryDate() != null) mm.setExpiryDate(req.getExpiryDate());
        if (req.getPrice() != null) mm.setPrice(req.getPrice());
        if (req.getPaymentMethod() != null) mm.setPaymentMethod(req.getPaymentMethod());
        if (req.getPaymentDate() != null) mm.setPaymentDate(req.getPaymentDate());
        MembershipStatus oldStatus = mm.getStatus();
        boolean wasActive = mm.isActive();
        if (req.getStatus() != null) {
            if (req.getStatus() == MembershipStatus.활성 && !wasActive
                    && memberMembershipRepository.existsActiveByMemberSeqExcluding(memberSeq, mmSeq)) {
                throw new IllegalStateException("이미 활성화된 멤버십이 존재합니다");
            }
            mm.setStatus(req.getStatus());
        }

        memberMembershipRepository.save(mm);

        // 카드 결제 정보 정정 — 카드 결제 payments의 cardPaymentDetail 일괄 갱신
        // (관리자가 초기 입력 시 오타 등을 수정할 수 있도록)
        if (req.getCardDetail() != null && CARD_METHOD.equals(req.getPaymentMethod())) {
            req.getCardDetail().validate();
            com.culcom.entity.complex.member.CardPaymentDetail updated = req.getCardDetail().toEntity();
            List<MembershipPayment> payments = paymentRepository.findByMemberMembershipSeqOrderByPaidDateAscSeqAsc(mmSeq);
            for (MembershipPayment p : payments) {
                if (CARD_METHOD.equals(p.getMethod())) {
                    p.setCardPaymentDetail(updated);
                    paymentRepository.save(p);
                }
            }
        }

        if (!Objects.equals(oldStatus, mm.getStatus())) {
            eventPublisher.publishEvent(ActivityEvent.withMembershipChange(
                    mm.getMember(), ActivityEventType.MEMBERSHIP_UPDATE, mm.getSeq(),
                    ActivityFieldType.STATUS,
                    oldStatus != null ? oldStatus.name() : null,
                    mm.getStatus() != null ? mm.getStatus().name() : null));
        }

        if (wasActive && !mm.isActive()) {
            memberClassService.detachMemberFromAllClasses(mm.getMember(), mm.getStatus().name());
        }

        return ComplexMemberMembershipResponse.from(mm);
    }

    /**
     * 회원의 활성 멤버십을 다른 상품으로 교체한다.
     * - 원본은 {@link MembershipStatus#변경}으로 종결 (수업 배정·연기 기록은 그대로 유지)
     * - 새 멤버십은 {@code 활성}으로 생성, {@code changedFromSeq}와 {@code changeFee}가 세팅된다
     * - 추가 비용이 0이 아니면 {@link MembershipPayment} 기록을 남긴다 (양수→ADDITIONAL, 음수→REFUND)
     */
    @Transactional
    public ComplexMemberMembershipResponse changeMembership(Long memberSeq, Long sourceMmSeq, MembershipChangeRequest req) {
        ComplexMemberMembership source = findOwnedMembership(memberSeq, sourceMmSeq);
        if (source.getStatus() != MembershipStatus.활성) {
            throw new IllegalStateException("활성 상태의 멤버십만 변경할 수 있습니다.");
        }

        Membership newProduct = membershipRepository.findById(req.getNewMembershipSeq())
                .orElseThrow(() -> new EntityNotFoundException("멤버십"));

        // 원본 상태를 변경으로 전환 (수업 배정 유지를 위해 detach 로직을 호출하지 않는다)
        source.setStatus(MembershipStatus.변경);
        memberMembershipRepository.save(source);

        LocalDate startDate = req.getStartDate() != null ? req.getStartDate() : LocalDate.now();
        LocalDate expiryDate = req.getExpiryDate() != null
                ? req.getExpiryDate() : startDate.plusDays(newProduct.getDuration());
        LocalDateTime paymentDate = req.getPaymentDate() != null ? req.getPaymentDate() : LocalDateTime.now();

        com.culcom.entity.complex.member.CardPaymentDetail cardDetail =
                resolveCardDetail(req.getPaymentMethod(), req.getCardDetail());

        ComplexMemberMembership target = ComplexMemberMembership.builder()
                .member(source.getMember())
                .membership(newProduct)
                .startDate(startDate)
                .expiryDate(expiryDate)
                .totalCount(newProduct.getCount())
                .price(req.getPrice())
                .paymentMethod(req.getPaymentMethod())
                .paymentDate(paymentDate)
                .status(MembershipStatus.활성)
                .changedFromSeq(source.getSeq())
                .changeFee(req.getChangeFee())
                .build();
        memberMembershipRepository.save(target);

        // 변경 추가 비용이 0이 아니면 결제 기록 생성 (정책 검증은 admin이 담당, 여기서는 직접 저장)
        Long fee = req.getChangeFee();
        if (fee != null && fee != 0L) {
            PaymentKind kind = fee > 0 ? PaymentKind.ADDITIONAL : PaymentKind.REFUND;
            String noteBase = "멤버십 변경 (" + source.getMembership().getName()
                    + " → " + newProduct.getName() + ")";
            MembershipPayment payment = MembershipPayment.builder()
                    .memberMembership(target)
                    .amount(fee)
                    .paidDate(paymentDate)
                    .method(req.getPaymentMethod())
                    .kind(kind)
                    .note(req.getChangeNote() != null && !req.getChangeNote().isBlank()
                            ? noteBase + " - " + req.getChangeNote()
                            : noteBase)
                    .cardPaymentDetail(cardDetail)
                    .build();
            paymentRepository.save(payment);
            target.getPayments().add(payment);
        }

        String logDetail = String.format("%s → %s (추가비용 %s원%s)",
                source.getMembership().getName(), newProduct.getName(),
                fee != null ? String.format("%,d", fee) : "0",
                req.getChangeNote() != null && !req.getChangeNote().isBlank()
                        ? ", 사유: " + req.getChangeNote() : "");
        eventPublisher.publishEvent(ActivityEvent.ofMembership(
                source.getMember(), ActivityEventType.MEMBERSHIP_CHANGE, target.getSeq(), logDetail));

        return ComplexMemberMembershipResponse.from(target, true);
    }

    @Transactional
    public void deleteMembership(Long memberSeq, Long mmSeq) {
        ComplexMemberMembership mm = findOwnedMembership(memberSeq, mmSeq);
        eventPublisher.publishEvent(ActivityEvent.ofMembership(
                mm.getMember(), ActivityEventType.MEMBERSHIP_DELETE, mm.getSeq(),
                mm.getMembership().getName() + " 멤버십 삭제"));

        memberMembershipRepository.delete(mm);
    }

    @Transactional(readOnly = true)
    public List<MembershipPaymentResponse> listPayments(Long memberSeq, Long mmSeq) {
        findOwnedMembership(memberSeq, mmSeq);
        return paymentRepository.findByMemberMembershipSeqOrderByPaidDateAscSeqAsc(mmSeq)
                .stream().map(MembershipPaymentResponse::from).toList();
    }

    @Transactional
    public MembershipPaymentResponse addPayment(Long memberSeq, Long mmSeq, MembershipPaymentRequest req) {
        ComplexMemberMembership mm = findOwnedMembership(memberSeq, mmSeq);

        if (req.getAmount() == null || req.getAmount() == 0L) {
            throw new IllegalArgumentException("금액은 0이 될 수 없습니다");
        }
        if (req.getKind() == PaymentKind.REFUND && req.getAmount() > 0) {
            throw new IllegalArgumentException("환불정정은 음수 금액이어야 합니다");
        }
        if (req.getKind() != PaymentKind.REFUND && req.getAmount() < 0) {
            throw new IllegalArgumentException("일반 납부는 양수 금액이어야 합니다");
        }

        if (req.getKind() != PaymentKind.REFUND) {
            Long total = PriceUtils.parse(mm.getPrice());
            if (total != null) {
                long alreadyPaid = paymentRepository.sumAmountByMemberMembershipSeq(mm.getSeq());
                long remaining = Math.max(0L, total - alreadyPaid);
                if (alreadyPaid + req.getAmount() > total) {
                    throw new IllegalArgumentException(
                            String.format("남은 미수금(%,d원)보다 큰 금액은 납부할 수 없습니다.", remaining));
                }
            }
        }

        com.culcom.entity.complex.member.CardPaymentDetail cardDetail =
                resolveCardDetail(req.getMethod(), req.getCardDetail());

        MembershipPayment payment = MembershipPayment.builder()
                .memberMembership(mm)
                .amount(req.getAmount())
                .paidDate(req.getPaidDate() != null ? req.getPaidDate() : LocalDateTime.now())
                .method(req.getMethod())
                .kind(req.getKind())
                .note(req.getNote())
                .cardPaymentDetail(cardDetail)
                .build();
        paymentRepository.save(payment);

        ActivityEventType eventType = req.getKind() == PaymentKind.REFUND
                ? ActivityEventType.PAYMENT_REFUND : ActivityEventType.PAYMENT_ADD;
        String note = String.format("%s %,d원 (%s)",
                req.getKind().getLabel(), req.getAmount(), mm.getMembership().getName());
        eventPublisher.publishEvent(ActivityEvent.ofMembership(
                mm.getMember(), eventType, mm.getSeq(), note));

        return MembershipPaymentResponse.from(payment);
    }

    private ComplexMemberMembership findOwnedMembership(Long memberSeq, Long mmSeq) {
        ComplexMemberMembership mm = memberMembershipRepository.findById(mmSeq)
                .orElseThrow(() -> new EntityNotFoundException("멤버십"));
        if (mm.getMember() == null || !mm.getMember().getSeq().equals(memberSeq)) {
            throw new EntityNotFoundException("멤버십");
        }
        return mm;
    }
}
