package com.culcom.service;

import com.culcom.dto.publicapi.*;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.complex.clazz.ComplexClass;
import com.culcom.entity.complex.clazz.ComplexClass;
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
import com.culcom.util.PriceUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PublicPostponementService {

    private final ComplexMemberRepository memberRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexPostponementRequestRepository postponementRepository;
    private final ComplexPostponementReasonRepository reasonRepository;
    private final MembershipPaymentRepository paymentRepository;
    private final BranchRepository branchRepository;
    private final ComplexClassRepository classRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final PublicMemberSearchService memberSearchService;

    public MemberSearchResponse searchMember(String name, String phone) {
        return memberSearchService.search(name, phone, ComplexMemberMembership::isActive, true);
    }

    @Transactional
    public PostponementSubmitResponse submit(PostponementSubmitRequest req) {
        Branch branch = branchRepository.findById(req.getBranchSeq())
                .orElseThrow(() -> new EntityNotFoundException("지점"));

        ComplexMember member = memberRepository.findById(req.getMemberSeq()).orElseThrow(() -> new EntityNotFoundException("유저"));
        ComplexMemberMembership membership = memberMembershipRepository.findById(req.getMemberMembershipSeq()).orElseThrow(() -> new EntityNotFoundException("멤버십"));

        if(!Objects.equals(membership.getMember().getSeq(), member.getSeq())){
            throw new IllegalArgumentException("접근할 수 없는 멤버십입니다.");
        }

        // 사용할 수 없는 멤버십(환불/만료/정지/기간소진/횟수소진)에는 연기 신청을 받지 않는다.
        if (!membership.isActive() || membership.getMembership().isInternal()) {
            throw new IllegalStateException("사용할 수 없는 멤버십에는 연기 신청을 할 수 없습니다.");
        }
        long paid = paymentRepository.sumAmountByMemberMembershipSeq(membership.getSeq());
        Long total = PriceUtils.parse(membership.getPrice());
        if (total != null && paid < total) {
            throw new IllegalStateException("미수금이 있어 연기 신청을 할 수 없습니다. 미수금을 완납 후 진행해주세요.");
        }

        // 겹침 검증: 기존 연기 기간(승인/대기)과 겹치면 차단. 겹치지 않는다면 동시에 여러 요청 허용.
        LocalDate newStart = DateTimeUtils.parseDate(req.getStartDate());
        LocalDate newEnd = DateTimeUtils.parseDate(req.getEndDate());
        if (newStart != null && newEnd != null) {
            if (postponementRepository.existsApprovedOverlap(membership.getSeq(), newStart, newEnd)) {
                throw new IllegalStateException("이미 승인된 연기 기간과 겹칩니다.");
            }
            if (postponementRepository.existsPendingOverlap(membership.getSeq(), newStart, newEnd)) {
                throw new IllegalStateException("이미 신청 중인 연기 기간과 겹칩니다.");
            }
        }

        ComplexClass desiredClass = null;
        if (req.getDesiredClassSeq() != null) {
            desiredClass = classRepository.findById(req.getDesiredClassSeq())
                    .filter(c -> c.getBranch() != null && c.getBranch().getSeq().equals(req.getBranchSeq()))
                    .orElse(null);
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
                .desiredClass(desiredClass)
                .build();

        postponementRepository.save(postponement);

        eventPublisher.publishEvent(ActivityEvent.of(member,
                ActivityEventType.POSTPONEMENT_REQUEST,
                "연기 요청 (공개): " + req.getStartDate() + " ~ " + req.getEndDate() + " / " + req.getReason()));

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
