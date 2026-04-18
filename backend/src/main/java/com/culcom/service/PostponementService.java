package com.culcom.service;

import com.culcom.dto.complex.ReasonDto;
import com.culcom.dto.complex.postponement.PostponementResponse;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.postponement.ComplexPostponementReason;
import com.culcom.entity.complex.postponement.ComplexPostponementRequest;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
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
    private final ComplexMemberMembershipRepository complexMemberMembershipRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final SmsService smsService;

    @Transactional
    public PostponementResponse updateStatus(Long seq, RequestStatus status, String adminMessage) {
        ComplexPostponementRequest req = postponementRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("연기 요청"));
        req.setStatus(status);
        req.setAdminMessage(adminMessage);
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
                req.getMember(), req.getMemberMembership(), status, adminMessage,
                ActivityEventType.POSTPONEMENT_APPROVE, ActivityEventType.POSTPONEMENT_REJECT,
                "연기 " + status.name() + ": " + req.getStartDate() + " ~ " + req.getEndDate());

        if (req.getMember() != null && req.getBranch() != null) {
            SmsEventType smsType = status == RequestStatus.승인 ? SmsEventType.연기승인 : SmsEventType.연기반려;
            smsService.sendEventSmsIfConfigured(req.getBranch().getSeq(), smsType,
                    req.getMemberName(), req.getPhoneNumber(),
                    SmsActionContext.of(status, adminMessage));
        }

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
