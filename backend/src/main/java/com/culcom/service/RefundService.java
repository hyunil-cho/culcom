package com.culcom.service;

import com.culcom.dto.complex.refund.RefundCreateRequest;
import com.culcom.dto.complex.refund.RefundReasonRequest;
import com.culcom.dto.complex.refund.RefundReasonResponse;
import com.culcom.dto.complex.refund.RefundResponse;
import com.culcom.entity.complex.refund.ComplexRefundReason;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
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
    private final ComplexMemberRepository complexMemberRepository;
    private final ComplexMemberMembershipRepository complexMemberMembershipRepository;
    private final ComplexMemberService complexMemberService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public RefundResponse create(RefundCreateRequest req, Long branchSeq) {
        ComplexRefundRequest entity = ComplexRefundRequest.builder()
                .memberName(req.getMemberName())
                .phoneNumber(req.getPhoneNumber())
                .membershipName(req.getMembershipName())
                .price(req.getPrice())
                .reason(req.getReason())
                .bankName(req.getBankName())
                .accountNumber(req.getAccountNumber())
                .accountHolder(req.getAccountHolder())
                .build();
        if (req.getMemberSeq() != null) {
            entity.setMember(complexMemberRepository.getReferenceById(req.getMemberSeq()));
        }
        if (req.getMemberMembershipSeq() != null) {
            entity.setMemberMembership(complexMemberMembershipRepository.getReferenceById(req.getMemberMembershipSeq()));
        }
        branchRepository.findById(branchSeq).ifPresent(entity::setBranch);
        refundRepository.save(entity);

        if (entity.getMember() != null) {
            eventPublisher.publishEvent(ActivityEvent.of(entity.getMember(),
                    ActivityEventType.REFUND_REQUEST,
                    "환불 요청: " + entity.getMembershipName() + " / " + entity.getReason()));
        }

        return RefundResponse.from(entity);
    }

    @Transactional
    public RefundResponse updateStatus(Long seq, RequestStatus status, String rejectReason) {
        ComplexRefundRequest req = refundRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("환불 요청"));
        req.setStatus(status);
        if (status == RequestStatus.반려) {
            req.setRejectReason(rejectReason);
        }
        if (status == RequestStatus.승인) {
            ComplexMemberMembership mm = req.getMemberMembership();
            if (mm != null) {
                boolean wasActive = mm.isActive();
                mm.setStatus(com.culcom.entity.enums.MembershipStatus.환불);
                complexMemberMembershipRepository.save(mm);
                if (wasActive && mm.getMember() != null) {
                    complexMemberService.detachMemberFromAllClasses(mm.getMember(), "환불");
                }
            }
        }
        refundRepository.save(req);

        if (req.getMember() != null) {
            ActivityEventType eventType = status == RequestStatus.승인
                    ? ActivityEventType.REFUND_APPROVE : ActivityEventType.REFUND_REJECT;
            String note = "환불 " + status.name() + ": " + req.getMembershipName();
            if (status == RequestStatus.반려 && rejectReason != null) {
                note += " (사유: " + rejectReason + ")";
            }
            Long mmSeq = req.getMemberMembership() != null ? req.getMemberMembership().getSeq() : null;
            eventPublisher.publishEvent(ActivityEvent.ofMembership(req.getMember(), eventType, mmSeq, note));
        }

        return RefundResponse.from(req);
    }

    public List<RefundReasonResponse> reasons(Long branchSeq) {
        return reasonRepository.findByBranchSeq(branchSeq).stream()
                .map(RefundReasonResponse::from)
                .collect(Collectors.toList());
    }

    public RefundReasonResponse addReason(RefundReasonRequest req, Long branchSeq) {
        ComplexRefundReason entity = ComplexRefundReason.builder()
                .reason(req.getReason())
                .build();
        branchRepository.findById(branchSeq).ifPresent(entity::setBranch);
        return RefundReasonResponse.from(reasonRepository.save(entity));
    }

    public void deleteReason(Long seq) {
        reasonRepository.deleteById(seq);
    }
}
