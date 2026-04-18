package com.culcom.service;

import com.culcom.dto.complex.ReasonDto;
import com.culcom.dto.complex.refund.RefundResponse;
import com.culcom.entity.complex.refund.ComplexRefundReason;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexRefundReasonRepository;
import com.culcom.repository.ComplexRefundRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RefundService {

    private final ComplexRefundRequestRepository refundRepository;
    private final ComplexRefundReasonRepository reasonRepository;
    private final BranchRepository branchRepository;
    private final ComplexMemberMembershipRepository complexMemberMembershipRepository;
    private final MemberClassService memberClassService;
    private final ApplicationEventPublisher eventPublisher;
    private final SmsService smsService;

    @Transactional
    public RefundResponse updateStatus(Long seq, RequestStatus status, String adminMessage) {
        ComplexRefundRequest req = refundRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("환불 요청"));
        // 승인/반려는 종결 상태로 비가역 처리한다.
        if (req.getStatus() == RequestStatus.승인 || req.getStatus() == RequestStatus.반려) {
            throw new IllegalStateException("이미 처리된 환불 요청은 상태를 변경할 수 없습니다.");
        }
        req.setStatus(status);
        req.setAdminMessage(adminMessage);
        if (status == RequestStatus.승인) {
            ComplexMemberMembership mm = req.getMemberMembership();
            if (mm != null) {
                boolean wasActive = mm.isActive();
                mm.setStatus(com.culcom.entity.enums.MembershipStatus.환불);
                complexMemberMembershipRepository.save(mm);
                if (wasActive && mm.getMember() != null) {
                    memberClassService.detachMemberFromAllClasses(mm.getMember(), "환불");
                }
            }
        }
        refundRepository.save(req);

        RequestStatusEventHelper.publishStatusChangeEvent(eventPublisher,
                req.getMember(), req.getMemberMembership(), status, adminMessage,
                ActivityEventType.REFUND_APPROVE, ActivityEventType.REFUND_REJECT,
                "환불 " + status.name() + ": " + req.getMembershipName());

        if (req.getMember() != null && req.getBranch() != null) {
            SmsEventType smsType = status == RequestStatus.승인 ? SmsEventType.환불승인 : SmsEventType.환불반려;
            smsService.sendEventSmsIfConfigured(req.getBranch().getSeq(), smsType,
                    req.getMemberName(), req.getPhoneNumber(),
                    SmsActionContext.of(status, adminMessage));
        }

        return RefundResponse.from(req);
    }

    public List<ReasonDto.Response> reasons(Long branchSeq) {
        return reasonRepository.findByBranchSeq(branchSeq).stream()
                .map(ReasonDto.Response::from)
                .collect(Collectors.toList());
    }

    public ReasonDto.Response addReason(ReasonDto.Request req, Long branchSeq) {
        ComplexRefundReason entity = ComplexRefundReason.builder()
                .reason(req.getReason())
                .build();
        branchRepository.findById(branchSeq).ifPresent(entity::setBranch);
        return ReasonDto.Response.from(reasonRepository.save(entity));
    }

    public void deleteReason(Long seq) {
        reasonRepository.deleteById(seq);
    }
}
