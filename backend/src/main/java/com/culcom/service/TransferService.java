package com.culcom.service;

import com.culcom.dto.consent.ConsentItemResponse;
import com.culcom.dto.transfer.*;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.consent.ConsentItem;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.customer.CustomerConsentHistory;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.TransferStatus;
import com.culcom.entity.transfer.TransferRequest;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.util.PriceUtils;
import com.culcom.repository.*;
import com.culcom.repository.MembershipPaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransferService {

    private final TransferRequestRepository transferRequestRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexMemberRepository complexMemberRepository;
    private final ConsentItemRepository consentItemRepository;
    private final CustomerRepository customerRepository;
    private final CustomerConsentHistoryRepository consentHistoryRepository;
    private final MembershipPaymentRepository paymentRepository;
    private final ComplexMemberService complexMemberService;
    private final ApplicationEventPublisher eventPublisher;

    // ── 양도비 계산 ──

    public int calculateTransferFee(int remainingCount) {
        if (remainingCount <= 16) return 20000;
        if (remainingCount <= 48) return 30000;
        return 50000;
    }

    // ── 관리자: 양도 요청 생성 ──

    @Transactional
    public TransferRequestResponse create(TransferCreateRequest req, Long branchSeq) {
        ComplexMemberMembership mm = memberMembershipRepository.findById(req.getMemberMembershipSeq())
                .orElseThrow(() -> new EntityNotFoundException("멤버십"));

        // 사용할 수 없는 멤버십(환불/만료/정지/기간소진/횟수소진)은 양도할 수 없다.
        // isActive()가 네 가지 비활성 케이스를 단일 진입점으로 판정한다.
        if (!mm.isActive()) {
            throw new IllegalStateException("사용할 수 없는 멤버십은 양도할 수 없습니다.");
        }

        // 양도 가능 여부 검증
        if (!Boolean.TRUE.equals(mm.getMembership().getTransferable())) {
            throw new IllegalStateException("양도 불가 멤버십입니다.");
        }

        // 재양도 차단
        if (Boolean.TRUE.equals(mm.getTransferred())) {
            throw new IllegalStateException("양도로 받은 멤버십은 재양도할 수 없습니다.");
        }

        // 미수금 검증 (단건 쿼리로 합계 조회, Lazy 컬렉션 접근 회피)
        long paid = paymentRepository.sumAmountByMemberMembershipSeq(mm.getSeq());
        Long total = PriceUtils.parse(mm.getPrice());
        if (total != null && paid < total) {
            throw new IllegalStateException("미수금이 있어 양도할 수 없습니다. 미수금을 완납 후 진행해주세요.");
        }

        int remaining = mm.getTotalCount() - mm.getUsedCount();
        int fee = calculateTransferFee(remaining);

        TransferRequest transfer = TransferRequest.builder()
                .memberMembership(mm)
                .fromMember(mm.getMember())
                .branch(mm.getMember().getBranch())
                .transferFee(fee)
                .remainingCount(remaining)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .build();

        return TransferRequestResponse.from(transferRequestRepository.save(transfer));
    }

    // ── 관리자: 목록 조회 ──

    public List<TransferRequestResponse> list() {
        return transferRequestRepository.findAll()
                .stream().map(TransferRequestResponse::from).toList();
    }

    // ── 관리자: 상태 변경 (확인/거절) ──

    @Transactional
    public TransferRequestResponse updateStatus(Long seq, TransferStatus status) {
        TransferRequest tr = transferRequestRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("양도 요청"));
        tr.setStatus(status);
        return TransferRequestResponse.from(transferRequestRepository.save(tr));
    }

    // ── 관리자: 양도 완료 (멤버십 이전) ──

    @Transactional
    public TransferRequestResponse completeTransfer(Long transferSeq, Long newMemberSeq) {
        TransferRequest tr = transferRequestRepository.findById(transferSeq)
                .orElseThrow(() -> new EntityNotFoundException("양도 요청"));

        ComplexMember newMember = complexMemberRepository.findById(newMemberSeq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));

        ComplexMemberMembership original = tr.getMemberMembership();
        ComplexMember fromMember = tr.getFromMember();
        String membershipName = original.getMembership().getName();
        int remaining = original.getTotalCount() - original.getUsedCount();

        // 1. 양도자 멤버십 비활성화
        original.setStatus(MembershipStatus.만료);
        memberMembershipRepository.save(original);

        // 2. 양도자 수업/팀 자동 제외
        complexMemberService.detachMemberFromAllClasses(fromMember, "양도");

        // 3. 양수자에게 동일한 멤버십 생성 (양도 불가 표시)
        ComplexMemberMembership newMm = ComplexMemberMembership.builder()
                .member(newMember)
                .membership(original.getMembership())
                .startDate(original.getStartDate())
                .expiryDate(original.getExpiryDate())
                .totalCount(original.getTotalCount())
                .usedCount(original.getUsedCount())
                .postponeTotal(original.getPostponeTotal())
                .postponeUsed(original.getPostponeUsed())
                .price(original.getPrice())
                .paymentMethod(original.getPaymentMethod())
                .paymentDate(original.getPaymentDate())
                .status(MembershipStatus.활성)
                .transferred(true)
                .build();
        memberMembershipRepository.save(newMm);

        // 4. 히스토리 기록 — 양도자 (양도 발신)
        eventPublisher.publishEvent(ActivityEvent.ofMembership(
                fromMember, ActivityEventType.TRANSFER_OUT, original.getSeq(),
                String.format("%s 멤버십 양도 → %s (잔여 %d회, 양수비 %,d원)",
                        membershipName, newMember.getName(), remaining, tr.getTransferFee())));

        // 5. 히스토리 기록 — 양수자 (양도 수신)
        eventPublisher.publishEvent(ActivityEvent.ofMembership(
                newMember, ActivityEventType.TRANSFER_IN, newMm.getSeq(),
                String.format("%s 멤버십 양도 ← %s (잔여 %d회, 양수비 %,d원)",
                        membershipName, fromMember.getName(), remaining, tr.getTransferFee())));

        // 6. 양도 요청 상태 확인으로 변경
        tr.setStatus(TransferStatus.확인);
        return TransferRequestResponse.from(transferRequestRepository.save(tr));
    }

    // ── 공개: 양도자 페이지 조회 (토큰) ──

    public TransferPublicInfoResponse getByToken(String token) {
        TransferRequest tr = transferRequestRepository.findByToken(token)
                .orElseThrow(() -> new EntityNotFoundException("양도 요청"));

        return TransferPublicInfoResponse.builder()
                .membershipName(tr.getMemberMembership().getMembership().getName())
                .fromMemberName(tr.getFromMember().getName())
                .remainingCount(tr.getRemainingCount())
                .expiryDate(tr.getMemberMembership().getExpiryDate().toString())
                .transferFee(tr.getTransferFee())
                .status(tr.getStatus().name())
                .inviteToken(tr.getInviteToken())
                .build();
    }

    // ── 공개: 양도자가 진행 확인 → 초대 토큰 생성 ──

    @Transactional
    public TransferPublicInfoResponse confirmAndGenerateInvite(String token) {
        TransferRequest tr = transferRequestRepository.findByToken(token)
                .orElseThrow(() -> new EntityNotFoundException("양도 요청"));

        if (tr.getInviteToken() == null) {
            tr.setInviteToken(UUID.randomUUID().toString().replace("-", ""));
            transferRequestRepository.save(tr);
        }

        return TransferPublicInfoResponse.builder()
                .membershipName(tr.getMemberMembership().getMembership().getName())
                .fromMemberName(tr.getFromMember().getName())
                .remainingCount(tr.getRemainingCount())
                .expiryDate(tr.getMemberMembership().getExpiryDate().toString())
                .transferFee(tr.getTransferFee())
                .status(tr.getStatus().name())
                .inviteToken(tr.getInviteToken())
                .build();
    }

    // ── 공개: 양수자 초대 페이지 조회 ──

    public TransferInviteInfoResponse getByInviteToken(String inviteToken) {
        TransferRequest tr = transferRequestRepository.findByInviteToken(inviteToken)
                .orElseThrow(() -> new EntityNotFoundException("양도 초대"));

        List<ConsentItemResponse> consents = consentItemRepository.findByCategory("TRANSFER")
                .stream().map(ConsentItemResponse::from).toList();

        return TransferInviteInfoResponse.builder()
                .membershipName(tr.getMemberMembership().getMembership().getName())
                .fromMemberName(tr.getFromMember().getName())
                .remainingCount(tr.getRemainingCount())
                .expiryDate(tr.getMemberMembership().getExpiryDate().toString())
                .transferFee(tr.getTransferFee())
                .consentItems(consents)
                .build();
    }

    // ── 공개: 양수자 정보 제출 → Customer 생성 + 동의 기록 ──

    @Transactional
    public void submitInvite(String inviteToken, TransferInviteSubmitRequest req) {
        TransferRequest tr = transferRequestRepository.findByInviteToken(inviteToken)
                .orElseThrow(() -> new EntityNotFoundException("양도 초대"));

        if (tr.getStatus() != TransferStatus.생성) {
            throw new IllegalStateException("이미 처리된 양도 요청입니다.");
        }

        // 코멘트 구성
        String comment = String.format("[멤버십 양도] %s님으로부터 %s 양도 (잔여 %d회, 양도비 %,d원)%s",
                tr.getFromMember().getName(),
                tr.getMemberMembership().getMembership().getName(),
                tr.getRemainingCount(),
                tr.getTransferFee(),
                req.getAvailableTime() != null ? " / 통화가능: " + req.getAvailableTime() : "");

        // Customer 생성
        Customer customer = Customer.builder()
                .branch(tr.getBranch())
                .name(req.getName())
                .phoneNumber(req.getPhoneNumber())
                .adSource("멤버십 양도")
                .comment(comment)
                .build();
        customer = customerRepository.save(customer);

        // 동의 기록 저장
        for (TransferInviteSubmitRequest.ConsentAgreement ca : req.getConsents()) {
            ConsentItem item = consentItemRepository.findById(ca.getConsentItemSeq())
                    .orElseThrow(() -> new EntityNotFoundException("동의항목"));

            CustomerConsentHistory history = CustomerConsentHistory.builder()
                    .customer(customer)
                    .consentItem(item)
                    .contentSnapshot(item.getContent())
                    .agreed(ca.getAgreed())
                    .version(item.getVersion())
                    .build();
            consentHistoryRepository.save(history);
        }

        // 양도 요청 상태 업데이트
        tr.setToCustomer(customer);
        tr.setStatus(TransferStatus.접수);
        transferRequestRepository.save(tr);
    }

}
