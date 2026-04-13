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
        // 이미 환불/만료/정지된 멤버십(또는 기간/횟수 소진)에는 환불 신청을 받지 않는다.
        // isActive()가 네 가지 사용 불가 케이스를 단일 진입점으로 판정한다.
        if (req.getMemberMembershipSeq() != null) {
            ComplexMemberMembership target = complexMemberMembershipRepository.findById(req.getMemberMembershipSeq())
                    .orElseThrow(() -> new EntityNotFoundException("멤버십"));
            if (!target.isActive()) {
                throw new IllegalStateException("사용할 수 없는 멤버십에는 환불 신청을 할 수 없습니다.");
            }
        }

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
        // 승인 상태는 비가역 — 환불은 멤버십 상태/수업 배정에 영향을 주는 종결 처리이므로
        // 다른 상태로 되돌릴 수 없다.
        if (req.getStatus() == RequestStatus.승인) {
            throw new IllegalStateException("이미 승인된 환불 요청은 상태를 변경할 수 없습니다.");
        }
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
