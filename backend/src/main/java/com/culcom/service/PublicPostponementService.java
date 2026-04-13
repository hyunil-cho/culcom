package com.culcom.service;

import com.culcom.dto.publicapi.*;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.postponement.ComplexPostponementReason;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.*;
import com.culcom.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PublicPostponementService {

    private final ComplexMemberRepository memberRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexPostponementRequestRepository postponementRepository;
    private final ComplexPostponementReasonRepository reasonRepository;
    private final BranchRepository branchRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final PublicMemberSearchService memberSearchService;

    public MemberSearchResponse searchMember(String name, String phone) {
        return memberSearchService.search(name, phone, ComplexMemberMembership::isUsable, true);
    }

    @Transactional
    public PostponementSubmitResponse submit(PostponementSubmitRequest req) {
        Branch branch = branchRepository.findById(req.getBranchSeq())
                .orElseThrow(() -> new EntityNotFoundException("지점"));

        ComplexMember member = memberRepository.findById(req.getMemberSeq()).orElse(null);
        ComplexMemberMembership membership = req.getMemberMembershipSeq() != null
                ? memberMembershipRepository.findById(req.getMemberMembershipSeq()).orElse(null)
                : null;

        // 사용할 수 없는 멤버십(환불/만료/정지/기간소진/횟수소진)에는 연기 신청을 받지 않는다.
        if (membership != null && !membership.isActive()) {
            throw new IllegalStateException("사용할 수 없는 멤버십에는 연기 신청을 할 수 없습니다.");
        }

        ComplexPostponementRequest postponement = ComplexPostponementRequest.builder()
                .branch(branch)
                .member(member)
                .memberMembership(membership)
                .memberName(req.getName())
                .phoneNumber(req.getPhone())
                .startDate(DateTimeUtils.parseDate(req.getStartDate()))
                .endDate(DateTimeUtils.parseDate(req.getEndDate()))
                .reason(req.getReason())
                .status(RequestStatus.대기)
                .build();

        postponementRepository.save(postponement);

        if (member != null) {
            eventPublisher.publishEvent(ActivityEvent.of(member,
                    ActivityEventType.POSTPONEMENT_REQUEST,
                    "연기 요청 (공개): " + req.getStartDate() + " ~ " + req.getEndDate() + " / " + req.getReason()));
        }

        return new PostponementSubmitResponse(
                req.getName(), req.getPhone(), branch.getBranchName(),
                req.getStartDate(), req.getEndDate(), req.getReason()
        );
    }

    public List<String> reasons(Long branchSeq) {
        return reasonRepository.findByBranchSeq(branchSeq).stream()
                .map(ComplexPostponementReason::getReason)
                .collect(Collectors.toList());
    }
}
