package com.culcom.service;

import com.culcom.dto.publicapi.MemberInfo;
import com.culcom.dto.publicapi.MemberSearchResponse;
import com.culcom.dto.publicapi.MembershipInfo;
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

    public MemberSearchResponse searchMember(String name, String phone) {
        List<ComplexMember> members = memberRepository.findByNameAndPhoneNumber(name, phone);
        if (members.isEmpty()) {
            return new MemberSearchResponse(List.of());
        }

        List<Long> memberSeqs = members.stream().map(ComplexMember::getSeq).toList();
        List<ComplexMemberMembership> allMemberships = memberMembershipRepository.findWithMembershipByMemberSeqIn(memberSeqs);
        Map<Long, List<ComplexMemberMembership>> membershipMap = allMemberships.stream()
                .collect(Collectors.groupingBy(mm -> mm.getMember().getSeq()));

        List<MemberInfo> memberInfos = members.stream().map(m -> {
            List<ComplexMemberMembership> memberships = membershipMap.getOrDefault(m.getSeq(), List.of());
            List<MembershipInfo> msInfos = memberships.stream()
                    .filter(mm -> Boolean.TRUE.equals(mm.getIsActive()))
                    .map(mm -> new MembershipInfo(
                            mm.getSeq(), mm.getMembership().getName(),
                            mm.getStartDate() != null ? mm.getStartDate().toString() : "",
                            mm.getExpiryDate() != null ? mm.getExpiryDate().toString() : "",
                            mm.getTotalCount(), mm.getUsedCount(),
                            mm.getPostponeTotal(), mm.getPostponeUsed()))
                    .toList();

            return new MemberInfo(
                    m.getSeq(), m.getName(), m.getPhoneNumber(),
                    m.getBranch().getSeq(), m.getBranch().getBranchName(),
                    m.getMetaData() != null ? m.getMetaData().getLevel() : null, msInfos, List.of());
        }).toList();

        return new MemberSearchResponse(memberInfos);
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

        ComplexRefundRequest refund = ComplexRefundRequest.builder()
                .branch(member.getBranch())
                .member(member)
                .memberMembership(memberMembershipRepository.findById(req.getMemberMembershipSeq()).orElse(null))
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
