package com.culcom.service;

import com.culcom.dto.complex.ReasonDto;
import com.culcom.dto.complex.postponement.PostponementCreateRequest;
import com.culcom.dto.complex.postponement.PostponementResponse;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.postponement.ComplexPostponementReason;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.ComplexPostponementReasonRepository;
import com.culcom.repository.ComplexPostponementRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostponementService {

    private final ComplexPostponementRequestRepository postponementRepository;
    private final ComplexPostponementReasonRepository reasonRepository;
    private final BranchRepository branchRepository;
    private final ComplexMemberRepository complexMemberRepository;
    private final ComplexMemberMembershipRepository complexMemberMembershipRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public PostponementResponse create(PostponementCreateRequest req, Long branchSeq) {
        if (req.getMemberMembershipSeq() != null) {
            ComplexMemberMembership mm = complexMemberMembershipRepository.findById(req.getMemberMembershipSeq())
                    .orElseThrow(() -> new EntityNotFoundException("멤버십"));
            // 사용할 수 없는 멤버십(환불/만료/정지/기간소진/횟수소진)에는 연기 신청을 받지 않는다.
            if (!mm.isActive()) {
                throw new IllegalStateException("사용할 수 없는 멤버십에는 연기 신청을 할 수 없습니다.");
            }
            // 멤버십이 허용한 최대 연기 횟수(postponeTotal)를 초과하는 신청은 거부한다.
            int used = mm.getPostponeUsed() != null ? mm.getPostponeUsed() : 0;
            int total = mm.getPostponeTotal() != null ? mm.getPostponeTotal() : 0;
            if (used >= total) {
                throw new IllegalStateException("연기 가능 횟수를 초과했습니다. (사용 " + used + "/" + total + ")");
            }
        }

        ComplexPostponementRequest entity = ComplexPostponementRequest.builder()
                .memberName(req.getMemberName())
                .phoneNumber(req.getPhoneNumber())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .reason(req.getReason())
                .build();
        if (req.getMemberSeq() != null) {
            entity.setMember(complexMemberRepository.findById(req.getMemberSeq())
                    .orElseThrow(() -> new EntityNotFoundException("회원")));
        }
        if (req.getMemberMembershipSeq() != null) {
            entity.setMemberMembership(complexMemberMembershipRepository.findById(req.getMemberMembershipSeq())
                    .orElseThrow(() -> new EntityNotFoundException("멤버십")));
        }
        branchRepository.findById(branchSeq).ifPresent(entity::setBranch);
        postponementRepository.save(entity);

        if (entity.getMember() != null) {
            eventPublisher.publishEvent(ActivityEvent.of(entity.getMember(),
                    ActivityEventType.POSTPONEMENT_REQUEST,
                    "연기 요청: " + entity.getStartDate() + " ~ " + entity.getEndDate() + " / " + entity.getReason()));
        }

        return PostponementResponse.from(entity);
    }

    @Transactional
    public PostponementResponse updateStatus(Long seq, RequestStatus status, String rejectReason) {
        ComplexPostponementRequest req = postponementRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("연기 요청"));
        req.setStatus(status);
        if (status == RequestStatus.반려) {
            req.setRejectReason(rejectReason);
        }
        if (status == RequestStatus.승인) {
            ComplexMemberMembership mm = req.getMemberMembership();
            if (mm != null) {
                mm.setPostponeUsed(mm.getPostponeUsed() + 1);
                // 연기는 멤버십 status를 변경하지 않는다.
                // "오늘 연기 중인지"는 complex_postponement_requests에서 기간으로 판정한다.
                complexMemberMembershipRepository.save(mm);
            }
        }
        postponementRepository.save(req);

        RequestStatusEventHelper.publishStatusChangeEvent(eventPublisher,
                req.getMember(), req.getMemberMembership(), status, rejectReason,
                ActivityEventType.POSTPONEMENT_APPROVE, ActivityEventType.POSTPONEMENT_REJECT,
                "연기 " + status.name() + ": " + req.getStartDate() + " ~ " + req.getEndDate());

        return PostponementResponse.from(req);
    }

    public List<ReasonDto.Response> reasons(Long branchSeq) {
        return reasonRepository.findByBranchSeq(branchSeq).stream()
                .map(ReasonDto.Response::from)
                .collect(Collectors.toList());
    }

    public ReasonDto.Response addReason(ReasonDto.Request req, Long branchSeq) {
        ComplexPostponementReason entity = ComplexPostponementReason.builder()
                .reason(req.getReason())
                .build();
        branchRepository.findById(branchSeq).ifPresent(entity::setBranch);
        return ReasonDto.Response.from(reasonRepository.save(entity));
    }

    public void deleteReason(Long seq) {
        reasonRepository.deleteById(seq);
    }
}
