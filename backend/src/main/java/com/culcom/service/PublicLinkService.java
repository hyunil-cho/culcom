package com.culcom.service;

import com.culcom.dto.publiclink.*;
import com.culcom.dto.transfer.TransferCreateRequest;
import com.culcom.dto.transfer.TransferRequestResponse;
import com.culcom.entity.PublicLink;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.enums.PublicLinkKind;
import com.culcom.entity.transfer.TransferRequest;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.PublicLinkRepository;
import com.culcom.repository.TransferRequestRepository;
import com.culcom.util.CodeGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class PublicLinkService {

    /** 단축 코드 길이. 62^8 ≈ 218조 (충돌 무시 가능) */
    private static final int CODE_LENGTH = 8;

    /** 코드 충돌 시 재시도 횟수 상한 */
    private static final int CODE_RETRY = 5;

    /** 발급 시점부터 유효 기간 (양도는 TransferRequest 자체의 유효성도 같이 검증) */
    private static final java.time.Duration LINK_VALID_DURATION = java.time.Duration.ofDays(7);

    private final PublicLinkRepository publicLinkRepository;
    private final ComplexMemberRepository memberRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final TransferRequestRepository transferRequestRepository;
    private final TransferService transferService;

    // ── 발급: 멤버십·연기·환불 ──

    @Transactional
    public PublicLinkCreateResponse create(PublicLinkCreateRequest req) {
        if (req.getKind() == PublicLinkKind.양도) {
            throw new IllegalArgumentException("양도 링크는 전용 endpoint(/transfer)를 사용하세요.");
        }
        ComplexMember member = memberRepository.findById(req.getMemberSeq())
                .orElseThrow(() -> new EntityNotFoundException("회원"));

        ComplexMemberMembership memberMembership = null;
        Integer refundAmount = null;
        if (req.getKind() == PublicLinkKind.환불) {
            if (req.getMemberMembershipSeq() == null || req.getRefundAmount() == null) {
                throw new IllegalArgumentException("환불 링크는 멤버십과 환불 금액이 필요합니다.");
            }
            memberMembership = memberMembershipRepository.findById(req.getMemberMembershipSeq())
                    .orElseThrow(() -> new EntityNotFoundException("멤버십"));
            refundAmount = req.getRefundAmount();
        }

        PublicLink link = PublicLink.builder()
                .code(generateUniqueCode())
                .kind(req.getKind())
                .member(member)
                .memberMembership(memberMembership)
                .refundAmount(refundAmount)
                .expiresAt(LocalDateTime.now().plus(LINK_VALID_DURATION))
                .build();
        publicLinkRepository.save(link);

        return PublicLinkCreateResponse.builder().code(link.getCode()).build();
    }

    // ── 발급: 양도 (TransferRequest + PublicLink 한 트랜잭션) ──

    @Transactional
    public PublicLinkTransferCreateResponse createForTransfer(PublicLinkCreateTransferRequest req) {
        TransferCreateRequest tcr = new TransferCreateRequest();
        tcr.setMemberMembershipSeq(req.getMemberMembershipSeq());
        tcr.setTransferFee(req.getTransferFee());

        TransferRequestResponse transferResp = transferService.create(tcr);

        TransferRequest tr = transferRequestRepository.findById(transferResp.getSeq())
                .orElseThrow(() -> new EntityNotFoundException("양도 요청"));

        PublicLink link = PublicLink.builder()
                .code(generateUniqueCode())
                .kind(PublicLinkKind.양도)
                .member(tr.getFromMember())
                .transferRequest(tr)
                .expiresAt(LocalDateTime.now().plus(LINK_VALID_DURATION))
                .build();
        publicLinkRepository.save(link);

        return PublicLinkTransferCreateResponse.builder()
                .code(link.getCode())
                .transferRequest(transferResp)
                .build();
    }

    // ── 조회 (공개) ──

    @Transactional(readOnly = true)
    public PublicLinkResolveResponse resolve(String code) {
        PublicLink link = publicLinkRepository.findByCode(code)
                .orElseThrow(() -> new EntityNotFoundException("링크"));

        if (link.isExpired()) {
            throw new IllegalStateException("만료된 링크입니다.");
        }
        // 양도 링크는 도메인 무결성도 같이 검증 (멤버십 비활성/상태 변경/만료)
        if (link.getKind() == PublicLinkKind.양도 && link.getTransferRequest() != null) {
            link.getTransferRequest().ensureLinkUsable();
        }

        return PublicLinkResolveResponse.from(link);
    }

    // ── 내부 ──

    private String generateUniqueCode() {
        for (int i = 0; i < CODE_RETRY; i++) {
            String code = CodeGenerator.generate(CODE_LENGTH);
            if (!publicLinkRepository.existsByCode(code)) return code;
        }
        throw new IllegalStateException("단축 코드 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
}
