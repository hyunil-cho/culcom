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
        // 승인/반려는 종결 상태로 비가역 처리한다.
        if (req.getStatus() == RequestStatus.승인 || req.getStatus() == RequestStatus.반려) {
            throw new IllegalStateException("이미 처리된 연기 요청은 상태를 변경할 수 없습니다.");
        }
        req.setStatus(status);
        req.setAdminMessage(adminMessage);
        if (status == RequestStatus.승인) {
            ComplexMemberMembership mm = req.getMemberMembership();
            mm.applyPostponement(req.getStartDate(), req.getEndDate());
        }

        RequestStatusEventHelper.publishStatusChangeEvent(eventPublisher,
                req.getMember(), req.getMemberMembership(), status, adminMessage,
                ActivityEventType.POSTPONEMENT_APPROVE, ActivityEventType.POSTPONEMENT_REJECT,
                "연기 " + status.name() + ": " + req.getStartDate() + " ~ " + req.getEndDate());

        String smsWarning = null;
        if (req.getMember() != null && req.getBranch() != null) {
            SmsEventType smsType = status == RequestStatus.승인 ? SmsEventType.연기승인 : SmsEventType.연기반려;
            smsWarning = smsService.sendEventSmsIfConfigured(req.getBranch().getSeq(), smsType,
                    req.getMemberName(), req.getPhoneNumber(),
                    SmsActionContext.of(status, adminMessage));
        }

        PostponementResponse response = PostponementResponse.from(req);
        response.setSmsWarning(smsWarning);
        return response;
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
