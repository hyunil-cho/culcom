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
    private final ApplicationEventPublisher eventPublisher;
    private final PublicMemberSearchService memberSearchService;

    public MemberSearchResponse searchMember(String name, String phone) {
        return memberSearchService.search(name, phone, ComplexMemberMembership::isActive, false);
    }

    @Transactional
    public void submit(RefundSubmitRequest req) {
        if (req.getMemberName() == null || req.getMemberName().isBlank() ||
            req.getReason() == null || req.getReason().isBlank() ||
            req.getBankName() == null || req.getBankName().isBlank() ||
            req.getAccountNumber() == null || req.getAccountNumber().isBlank() ||
            req.getAccountHolder() == null || req.getAccountHolder().isBlank()) {
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

        ComplexRefundRequest refund = ComplexRefundRequest.builder()
                .branch(member.getBranch())
                .member(member)
                .memberMembership(targetMembership)
                .memberName(req.getMemberName())
                .phoneNumber(req.getPhoneNumber())
                .membershipName(req.getMembershipName())
                .price(req.getPrice())
                .reason(req.getReason())
                .bankName(req.getBankName())
                .accountNumber(req.getAccountNumber())
                .accountHolder(req.getAccountHolder())
                .status(RequestStatus.대기)
                .build();

        refundRequestRepository.save(refund);

        eventPublisher.publishEvent(ActivityEvent.of(member,
                ActivityEventType.REFUND_REQUEST,
                "환불 요청 (공개): " + req.getMembershipName() + " / " + req.getReason()));
    }

    public List<String> reasons(Long branchSeq) {
        return refundReasonRepository.findByBranchSeq(branchSeq).stream()
                .map(ComplexRefundReason::getReason)
                .toList();
    }
}
