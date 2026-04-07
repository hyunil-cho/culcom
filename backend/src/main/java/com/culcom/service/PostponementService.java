package com.culcom.service;

import com.culcom.dto.complex.postponement.PostponementCreateRequest;
import com.culcom.dto.complex.postponement.PostponementReasonRequest;
import com.culcom.dto.complex.postponement.PostponementReasonResponse;
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
        ComplexPostponementRequest entity = ComplexPostponementRequest.builder()
                .memberName(req.getMemberName())
                .phoneNumber(req.getPhoneNumber())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .reason(req.getReason())
                .build();
        if (req.getMemberSeq() != null) {
            entity.setMember(complexMemberRepository.getReferenceById(req.getMemberSeq()));
        }
        if (req.getMemberMembershipSeq() != null) {
            entity.setMemberMembership(complexMemberMembershipRepository.getReferenceById(req.getMemberMembershipSeq()));
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

        if (req.getMember() != null) {
            ActivityEventType eventType = status == RequestStatus.승인
                    ? ActivityEventType.POSTPONEMENT_APPROVE : ActivityEventType.POSTPONEMENT_REJECT;
            String note = "연기 " + status.name() + ": " + req.getStartDate() + " ~ " + req.getEndDate();
            if (status == RequestStatus.반려 && rejectReason != null) {
                note += " (사유: " + rejectReason + ")";
            }
            Long mmSeq = req.getMemberMembership() != null ? req.getMemberMembership().getSeq() : null;
            eventPublisher.publishEvent(ActivityEvent.ofMembership(req.getMember(), eventType, mmSeq, note));
        }

        return PostponementResponse.from(req);
    }

    public List<PostponementReasonResponse> reasons(Long branchSeq) {
        return reasonRepository.findByBranchSeq(branchSeq).stream()
                .map(PostponementReasonResponse::from)
                .collect(Collectors.toList());
    }

    public PostponementReasonResponse addReason(PostponementReasonRequest req, Long branchSeq) {
        ComplexPostponementReason entity = ComplexPostponementReason.builder()
                .reason(req.getReason())
                .build();
        branchRepository.findById(branchSeq).ifPresent(entity::setBranch);
        return PostponementReasonResponse.from(reasonRepository.save(entity));
    }

    public void deleteReason(Long seq) {
        reasonRepository.deleteById(seq);
    }
}
