package com.culcom.service;

import com.culcom.dto.publicapi.MemberSearchResponse;
import com.culcom.dto.publicapi.RefundSubmitRequest;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.refund.ComplexRefundReason;
import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.ComplexRefundReasonRepository;
import com.culcom.repository.ComplexRefundRequestRepository;
import com.culcom.repository.MembershipPaymentRepository;
import com.culcom.util.PriceUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PublicRefundService {

    private final ComplexMemberRepository memberRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexRefundRequestRepository refundRequestRepository;
    private final ComplexRefundReasonRepository refundReasonRepository;
    private final MembershipPaymentRepository paymentRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final PublicMemberSearchService memberSearchService;

    public MemberSearchResponse searchMember(String name, String phone) {
        MemberSearchResponse raw = memberSearchService.search(name, phone, ComplexMemberMembership::isActive, false);

        // 이미 대기/반려 상태의 환불 요청이 있는 멤버십은 선택 목록에서 제외한다.
        java.util.List<Long> allMmSeqs = raw.getMembers().stream()
                .flatMap(m -> m.getMemberships().stream())
                .map(com.culcom.dto.publicapi.MembershipInfo::getSeq)
                .toList();
        if (allMmSeqs.isEmpty()) return raw;

        java.util.Set<Long> blocked = new java.util.HashSet<>(
                refundRequestRepository.findBlockedMemberMembershipSeqs(allMmSeqs));
        if (blocked.isEmpty()) return raw;

        java.util.List<com.culcom.dto.publicapi.MemberInfo> filtered = raw.getMembers().stream()
                .map(m -> new com.culcom.dto.publicapi.MemberInfo(
                        m.getSeq(), m.getName(), m.getPhoneNumber(),
                        m.getBranchSeq(), m.getBranchName(), m.getLevel(),
                        m.getMemberships().stream()
                                .filter(ms -> !blocked.contains(ms.getSeq()))
                                .toList(),
                        m.getClasses()))
                .toList();

        // 활성 멤버십이 전부 차단된 경우 링크 만료로 처리한다.
        boolean allFiltered = !raw.getMembers().isEmpty()
                && filtered.stream().allMatch(m -> m.getMemberships().isEmpty());
        if (allFiltered) {
            throw new IllegalStateException("이미 만료된 링크입니다.");
        }
        return new MemberSearchResponse(filtered);
    }

    @Transactional
    public Long submit(RefundSubmitRequest req) {
        if (req.getMemberName() == null || req.getMemberName().isBlank() ||
            req.getReason() == null || req.getReason().isBlank()) {
            throw new IllegalArgumentException("필수 항목을 모두 입력해주세요.");
        }

        ComplexMember member = memberRepository.findById(req.getMemberSeq())
                .orElseThrow(() -> new EntityNotFoundException("회원"));

        // 사용할 수 없는 멤버십(환불/만료/정지/기간소진/횟수소진)에는 환불 신청을 받지 않는다.
        ComplexMemberMembership targetMembership = req.getMemberMembershipSeq() != null
                ? memberMembershipRepository.findById(req.getMemberMembershipSeq()).orElse(null)
                : null;
        if (targetMembership != null && !targetMembership.isActive()) {
            throw new IllegalStateException("사용할 수 없는 멤버십에는 환불 신청을 할 수 없습니다.");
        }
        if (targetMembership != null
                && refundRequestRepository.existsBlockingByMemberMembershipSeq(targetMembership.getSeq())) {
            throw new IllegalStateException("이미 만료된 링크입니다.");
        }
        if (targetMembership != null) {
            long paid = paymentRepository.sumAmountByMemberMembershipSeq(targetMembership.getSeq());
            Long total = PriceUtils.parse(targetMembership.getPrice());
            if (total != null && paid < total) {
                throw new IllegalStateException("미수금이 있어 환불 신청을 할 수 없습니다. 미수금을 완납 후 진행해주세요.");
            }
        }

        ComplexRefundRequest refund = ComplexRefundRequest.builder()
                .branch(member.getBranch())
                .member(member)
                .memberMembership(targetMembership)
                .memberName(req.getMemberName())
                .phoneNumber(req.getPhoneNumber())
                .membershipName(req.getMembershipName())
                .price(req.getPrice())
                .reason(req.getReason())
                .status(RequestStatus.대기)
                .build();

        refundRequestRepository.save(refund);

        eventPublisher.publishEvent(ActivityEvent.of(member,
                ActivityEventType.REFUND_REQUEST,
                "환불 요청 (공개): " + req.getMembershipName() + " / " + req.getReason()));

        return refund.getSeq();
    }

    public List<String> reasons(Long branchSeq) {
        return refundReasonRepository.findByBranchSeq(branchSeq).stream()
                .map(ComplexRefundReason::getReason)
                .toList();
    }
}
