package com.culcom.service;

import com.culcom.dto.consent.ConsentItemResponse;
import com.culcom.dto.transfer.*;
import com.culcom.entity.complex.member.CardPaymentDetail;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.MembershipPayment;
import com.culcom.entity.consent.ConsentItem;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.customer.CustomerConsentHistory;
import com.culcom.entity.enums.ActivityEventType;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.PaymentKind;
import com.culcom.entity.enums.SmsEventType;
import com.culcom.entity.enums.TransferStatus;
import com.culcom.entity.transfer.TransferRequest;
import com.culcom.event.ActivityEvent;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.util.PriceUtils;
import com.culcom.repository.*;
import com.culcom.repository.MembershipPaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
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
    private final MemberClassService memberClassService;
    private final SmsService smsService;
    private final ApplicationEventPublisher eventPublisher;

    // ── 양도비 계산 ──

    private int calculateTransferFee(int remainingCount) {
        if (remainingCount <= 16) return 20000;
        if (remainingCount <= 48) return 30000;
        return 50000;
    }

    // ── 관리자: 양도 요청 생성 ──

    @Transactional
    public TransferRequestResponse create(TransferCreateRequest req) {
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
        // 관리자가 직접 지정한 양도비가 있으면 그것을, 없으면 잔여 횟수 기반 자동 계산을 사용한다.
        int fee = req.getTransferFee() != null ? req.getTransferFee() : calculateTransferFee(remaining);
        if (fee < 0) {
            throw new IllegalArgumentException("양도비는 0 이상이어야 합니다.");
        }

        TransferRequest transfer = TransferRequest.builder()
                .memberMembership(mm)
                .fromMember(mm.getMember())
                .branch(mm.getMember().getBranch())
                .transferFee(fee)
                .remainingCount(remaining)
                .token(UUID.randomUUID().toString().replace("-", ""))
                .build();

        TransferRequest saved = transferRequestRepository.save(transfer);

        eventPublisher.publishEvent(ActivityEvent.ofMembership(
                mm.getMember(), ActivityEventType.TRANSFER_REQUEST, mm.getSeq(),
                String.format("%s 양도 요청 생성 (잔여 %d회, 양도비 %,d원)",
                        mm.getMembership().getName(), remaining, fee)));

        return TransferRequestResponse.from(saved);
    }

    // ── 관리자: 목록 조회 ──

    /**
     * 지점/이름/전화/상태/활성여부 필터로 양도 요청 목록을 조회한다.
     *
     * @param branchSeq  세션의 선택 지점
     * @param name       null/빈값 허용, fromMember 또는 toCustomer 이름과 부분 매칭
     * @param phone      null/빈값 허용, fromMember 또는 toCustomer 전화와 부분 매칭
     * @param activeOnly status가 null일 때만 적용. true면 생성/접수 상태만 반환
     * @param status     특정 상태 필터 (null이면 활성/전체는 {@code activeOnly}로 결정)
     */
    public Page<TransferRequestResponse> list(
            Long branchSeq, String name, String phone,
            boolean activeOnly, com.culcom.entity.enums.TransferStatus status,
            boolean includeReferenced, Pageable pageable) {
        return transferRequestRepository.findFiltered(branchSeq, name, phone, activeOnly, status, includeReferenced, pageable)
                .map(TransferRequestResponse::from);
    }

    /**
     * 신규 회원 등록 화면에서 고를 수 있는 양도 요청 목록.
     * 관리자가 최종 '확인' 승인한 + 연결 멤버십 활성 + 아직 사용되지 않은 건만 반환한다.
     */
    public List<TransferRequestResponse> listSelectable(Long branchSeq) {
        return transferRequestRepository.findSelectable(branchSeq).stream()
                .map(TransferRequestResponse::from)
                .toList();
    }

    // ── 관리자: 상태 변경 (확인/거절) ──

    @Transactional
    public TransferRequestResponse updateStatus(Long seq, TransferStatus status, String adminMessage) {
        TransferRequest tr = transferRequestRepository.findById(seq)
                .orElseThrow(() -> new EntityNotFoundException("양도 요청"));
        // 확인/거절은 종결 상태로 비가역 처리한다.
        if (tr.getStatus() == TransferStatus.확인 || tr.getStatus() == TransferStatus.거절) {
            throw new IllegalStateException("이미 처리된 양도 요청은 상태를 변경할 수 없습니다.");
        }
        tr.setStatus(status);
        tr.setAdminMessage(adminMessage);
        // 참조 완료는 "실제로 양수로 활용된 경우"만. 거절은 종결이지만 참조된 것이 아니므로 플래그를 올리지 않는다.
        // (거절 건을 리스트에서 감추려면 status=거절 필터를 사용한다.)
        TransferRequestResponse response = TransferRequestResponse.from(tr);

        if (status == TransferStatus.거절 && tr.getFromMember() != null) {
            Long mmSeq = tr.getMemberMembership() != null ? tr.getMemberMembership().getSeq() : null;
            String membershipName = tr.getMemberMembership() != null
                    ? tr.getMemberMembership().getMembership().getName() : "멤버십";
            eventPublisher.publishEvent(ActivityEvent.ofMembership(
                    tr.getFromMember(), ActivityEventType.TRANSFER_REJECT, mmSeq,
                    String.format("%s 양도 요청 거절%s",
                            membershipName,
                            adminMessage != null && !adminMessage.isBlank() ? " (사유: " + adminMessage + ")" : "")));

            if (tr.getBranch() != null) {
                String smsWarning = smsService.sendEventSmsIfConfigured(tr.getBranch().getSeq(), SmsEventType.양도거절,
                        tr.getFromMember().getName(), tr.getFromMember().getPhoneNumber(),
                        SmsActionContext.ofTransfer(status, adminMessage));
                response.setSmsWarning(smsWarning);
            }
        }

        return response;
    }

    // ── 관리자: 양도 완료 (멤버십 이전) ──

    @Transactional
    public TransferRequestResponse completeTransfer(Long transferSeq, Long newMemberSeq) {
        return completeTransfer(transferSeq, newMemberSeq, new TransferCompleteRequest());
    }

    @Transactional
    public TransferRequestResponse completeTransfer(Long transferSeq, Long newMemberSeq,
                                                    TransferCompleteRequest paymentInfo) {
        TransferRequest tr = transferRequestRepository.findById(transferSeq)
                .orElseThrow(() -> new EntityNotFoundException("양도 요청"));

        ComplexMember newMember = complexMemberRepository.findById(newMemberSeq)
                .orElseThrow(() -> new EntityNotFoundException("회원"));

        ComplexMemberMembership original = tr.getMemberMembership();
        ComplexMember fromMember = tr.getFromMember();

        // 자기 자신에게 양도 차단
        if (fromMember.getSeq().equals(newMemberSeq)) {
            throw new IllegalStateException("자기 자신에게 양도할 수 없습니다.");
        }
        // 관리자가 최종 '확인'한 건만 회원 등록에 연결할 수 있다.
        if (tr.getStatus() != TransferStatus.확인) {
            throw new IllegalStateException("관리자 확인을 받지 않은 양도 요청은 회원에 연결할 수 없습니다.");
        }
        // 이미 다른 회원 등록에 사용된 양도 요청은 재사용 불가.
        if (Boolean.TRUE.equals(tr.getReferenced())) {
            throw new IllegalStateException("이미 사용된 양도 요청입니다.");
        }
        // 원본 멤버십이 더 이상 활성이 아니면 양도 완료 차단
        if (!original.isActive()) {
            throw new IllegalStateException("사용할 수 없는 멤버십은 양도를 완료할 수 없습니다.");
        }
        // 미수금 재검증 — 요청 생성 시 통과했더라도 그 후 납부 기록이 수정/삭제되어 미수금이 생긴 경우를 방어한다.
        long paid = paymentRepository.sumAmountByMemberMembershipSeq(original.getSeq());
        Long totalPrice = PriceUtils.parse(original.getPrice());
        if (totalPrice != null && paid < totalPrice) {
            throw new IllegalStateException("미수금이 있어 양도를 완료할 수 없습니다. 미수금을 완납 후 진행해주세요.");
        }

        String membershipName = original.getMembership().getName();
        int remaining = original.getTotalCount() - original.getUsedCount();

        // 1. 양도자 멤버십 비활성화
        original.setStatus(MembershipStatus.만료);

        // 2. 양도자 수업/팀 자동 제외
        memberClassService.detachMemberFromAllClasses(fromMember, "양도");

        // 3. 양수자에게 동일한 멤버십 생성 (양도 불가 표시)
        //    - price = transferFee 로 저장되어, 양수자의 미수금이 양도비 기준으로만 계산된다.
        //    - changedFromSeq/changeFee 로 원본과의 유래 링크를 남긴다.
        ComplexMemberMembership newMm = original.copyForTransferTo(newMember, tr.getTransferFee());
        memberMembershipRepository.save(newMm);

        // 3-1. 양수자 멤버십에 '양도비' 납부 기록을 남겨 미수금 0이 되도록 한다.
        //      요청에 결제수단/결제일/카드 상세가 포함되면 그대로 반영.
        String paymentMethod = paymentInfo != null ? paymentInfo.getPaymentMethod() : null;
        LocalDateTime providedPaidAt = paymentInfo != null ? paymentInfo.getPaymentDate() : null;
        // MembershipPayment.paidDate 는 NOT NULL 이므로 미지정 시 현재 시각으로 기록.
        LocalDateTime paidAt = providedPaidAt != null ? providedPaidAt : LocalDateTime.now();
        CardPaymentDetail cardDetail = resolveCardDetail(paymentMethod,
                paymentInfo != null ? paymentInfo.getCardDetail() : null);

        MembershipPayment transferPayment = MembershipPayment.builder()
                .memberMembership(newMm)
                .amount((long) tr.getTransferFee())
                .paidDate(paidAt)
                .method(paymentMethod)
                .kind(PaymentKind.DEPOSIT)
                .note("멤버십 양도 (" + membershipName + ") - 양도비")
                .cardPaymentDetail(cardDetail)
                .build();
        paymentRepository.save(transferPayment);

        // 양수자 멤버십의 결제수단/결제일 메타 필드는 요청에 명시된 값이 있을 때만 설정.
        newMm.setPaymentMethod(paymentMethod);
        newMm.setPaymentDate(providedPaidAt);
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

        // 6. 참조 완료 표시 — 상태는 이미 확인이므로 변경 불필요
        tr.setReferenced(true);

        // 7. SMS 알림 — 양도자/양수자 두 명에게 발송, 경고는 합쳐서 응답에 담는다
        String smsWarning = null;
        if (tr.getBranch() != null) {
            Map<String, String> ctx = SmsActionContext.ofTransfer(
                    com.culcom.entity.enums.TransferStatus.확인, tr.getAdminMessage());
            String warnFrom = smsService.sendEventSmsIfConfigured(tr.getBranch().getSeq(), SmsEventType.양도완료,
                    fromMember.getName(), fromMember.getPhoneNumber(), ctx);
            String warnTo = smsService.sendEventSmsIfConfigured(tr.getBranch().getSeq(), SmsEventType.양도완료,
                    newMember.getName(), newMember.getPhoneNumber(), ctx);
            smsWarning = mergeSmsWarnings(warnFrom, warnTo);
        }

        TransferRequestResponse response = TransferRequestResponse.from(tr);
        response.setSmsWarning(smsWarning);
        return response;
    }

    /** 결제수단이 '카드'일 때만 카드 상세를 받아 유효성 검증 후 엔티티로 변환. 그 외에는 null. */
    private CardPaymentDetail resolveCardDetail(String method,
                                                com.culcom.dto.complex.member.CardPaymentDetailDto dto) {
        if (!"카드".equals(method)) return null;
        if (dto == null) {
            throw new IllegalArgumentException("카드 결제 시 카드 상세 정보를 입력하세요.");
        }
        dto.validate();
        return dto.toEntity();
    }

    /**
     * 양도자/양수자 SMS 경고를 합친다.
     * 동일 메시지면 한 번만, 둘 다 있고 다르면 양쪽 누구에게 실패했는지 표기한다.
     */
    private String mergeSmsWarnings(String warnFrom, String warnTo) {
        if (warnFrom == null && warnTo == null) return null;
        if (warnFrom == null) return "양수자 " + warnTo;
        if (warnTo == null) return "양도자 " + warnFrom;
        if (warnFrom.equals(warnTo)) return warnFrom;
        return "양도자 " + warnFrom + " / 양수자 " + warnTo;
    }

    // ── 공개: 양도자 페이지 조회 (토큰) ──

    public TransferPublicInfoResponse getByToken(String token) {
        TransferRequest tr = transferRequestRepository.findByToken(token)
                .orElseThrow(() -> new EntityNotFoundException("양도 요청"));

        tr.ensureLinkUsable();

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

        tr.ensureLinkUsable();

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

        tr.ensureLinkUsable();

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

        tr.ensureLinkUsable();

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
