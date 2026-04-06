package com.culcom.controller.publicapi;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.publicapi.*;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.refund.ComplexRefundRequest;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.ComplexRefundReasonRepository;
import com.culcom.repository.ComplexRefundRequestRepository;
import com.culcom.entity.complex.refund.ComplexRefundReason;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public/refund")
@RequiredArgsConstructor
public class PublicRefundController {

    private final ComplexMemberRepository memberRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final ComplexRefundRequestRepository refundRequestRepository;
    private final ComplexRefundReasonRepository refundReasonRepository;

    @GetMapping("/search-member")
    public ResponseEntity<ApiResponse<MemberSearchResponse>> searchMember(
            @RequestParam String name, @RequestParam String phone) {
        List<ComplexMember> members = memberRepository.findByNameAndPhoneNumber(name, phone);
        if (members.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(new MemberSearchResponse(List.of())));
        }

        List<Long> memberSeqs = members.stream().map(ComplexMember::getSeq).toList();
        List<ComplexMemberMembership> allMemberships = memberMembershipRepository.findByMemberSeqIn(memberSeqs);
        Map<Long, List<ComplexMemberMembership>> membershipMap = allMemberships.stream()
                .collect(Collectors.groupingBy(mm -> mm.getMember().getSeq()));

        List<MemberInfo> memberInfos = members.stream().map(m -> {
            List<ComplexMemberMembership> memberships = membershipMap.getOrDefault(m.getSeq(), List.of());
            List<MembershipInfo> msInfos = memberships.stream()
                    .filter(mm -> mm.getStatus() == MembershipStatus.활성 || mm.getStatus() == MembershipStatus.연기)
                    .map(mm -> new MembershipInfo(
                            mm.getSeq(), mm.getMembership().getName(),
                            mm.getStartDate() != null ? mm.getStartDate().toString() : "",
                            mm.getExpiryDate() != null ? mm.getExpiryDate().toString() : "",
                            mm.getTotalCount(), mm.getUsedCount(),
                            mm.getPostponeTotal(), mm.getPostponeUsed()))
                    .toList();

            return new MemberInfo(
                    m.getSeq(), m.getName(), m.getPhoneNumber(),
                    m.getBranch().getSeq(), m.getBranch().getBranchName(),
                    m.getLevel(), msInfos, List.of());
        }).toList();

        return ResponseEntity.ok(ApiResponse.ok(new MemberSearchResponse(memberInfos)));
    }

    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<Void>> submit(@RequestBody RefundSubmitRequest req) {
        if (req.getMemberName() == null || req.getMemberName().isBlank() ||
            req.getReason() == null || req.getReason().isBlank() ||
            req.getBankName() == null || req.getBankName().isBlank() ||
            req.getAccountNumber() == null || req.getAccountNumber().isBlank() ||
            req.getAccountHolder() == null || req.getAccountHolder().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("필수 항목을 모두 입력해주세요."));
        }

        ComplexMember member = memberRepository.findById(req.getMemberSeq()).orElse(null);
        if (member == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("회원을 찾을 수 없습니다."));
        }

        ComplexRefundRequest refund = ComplexRefundRequest.builder()
                .branch(member.getBranch())
                .member(member)
                .memberMembership(memberMembershipRepository.findById(req.getMemberMembershipSeq()).orElse(null))
                .memberName(req.getMemberName())
                .phoneNumber(req.getPhoneNumber())
                .membershipName(req.getMembershipName())
                .price(req.getPrice())
                .reason(req.getReason())
                .bankName(req.getBankName())
                .accountNumber(req.getAccountNumber())
                .accountHolder(req.getAccountHolder())
                .status(RequestStatus.대기)
                .build();

        refundRequestRepository.save(refund);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/reasons")
    public ResponseEntity<ApiResponse<List<String>>> reasons(@RequestParam Long branchSeq) {
        List<String> result = refundReasonRepository.findByBranchSeq(branchSeq).stream()
                .map(ComplexRefundReason::getReason)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
