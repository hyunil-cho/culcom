package com.culcom.controller.complex.member;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.member.ComplexMemberMembershipRequest;
import com.culcom.dto.complex.member.ComplexMemberMembershipResponse;
import com.culcom.dto.complex.member.ComplexMemberRequest;
import com.culcom.dto.complex.member.ComplexMemberResponse;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.entity.complex.member.ComplexMemberMembership;
import com.culcom.entity.complex.member.Membership;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.repository.MembershipRepository;
import com.culcom.config.security.CustomUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/complex/members")
@RequiredArgsConstructor
public class ComplexMemberController {

    private final ComplexMemberRepository memberRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
    private final MembershipRepository membershipRepository;
    private final BranchRepository branchRepository;

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexMemberResponse>> get(@PathVariable Long seq) {
        return memberRepository.findById(seq)
                .map(m -> ResponseEntity.ok(ApiResponse.ok(ComplexMemberResponse.from(m))))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{seq}/memberships")
    public ResponseEntity<ApiResponse<List<ComplexMemberMembershipResponse>>> getMemberships(@PathVariable Long seq) {
        List<ComplexMemberMembershipResponse> result = memberMembershipRepository.findByMemberSeq(seq)
                .stream().map(ComplexMemberMembershipResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ComplexMemberResponse>> create(
            @RequestBody ComplexMemberRequest req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        ComplexMember member = ComplexMember.builder()
                .name(req.getName())
                .phoneNumber(req.getPhoneNumber())
                .level(req.getLevel())
                .language(req.getLanguage())
                .info(req.getInfo())
                .chartNumber(req.getChartNumber())
                .comment(req.getComment())
                .signupChannel(req.getSignupChannel())
                .interviewer(req.getInterviewer())
                .branch(branchRepository.getReferenceById(branchSeq))
                .build();
        return ResponseEntity.ok(ApiResponse.ok("회원 추가 완료", ComplexMemberResponse.from(memberRepository.save(member))));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexMemberResponse>> update(
            @PathVariable Long seq, @RequestBody ComplexMemberRequest req) {
        return memberRepository.findById(seq)
                .map(member -> {
                    member.setName(req.getName());
                    member.setPhoneNumber(req.getPhoneNumber());
                    member.setLevel(req.getLevel());
                    member.setLanguage(req.getLanguage());
                    member.setInfo(req.getInfo());
                    member.setChartNumber(req.getChartNumber());
                    member.setComment(req.getComment());
                    member.setSignupChannel(req.getSignupChannel());
                    member.setInterviewer(req.getInterviewer());
                    return ResponseEntity.ok(ApiResponse.ok("회원 수정 완료", ComplexMemberResponse.from(memberRepository.save(member))));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{seq}/memberships")
    public ResponseEntity<ApiResponse<ComplexMemberMembershipResponse>> assignMembership(
            @PathVariable Long seq, @RequestBody ComplexMemberMembershipRequest req) {
        ComplexMember member = memberRepository.findById(seq).orElse(null);
        if (member == null) return ResponseEntity.notFound().build();

        Membership membership = membershipRepository.findById(req.getMembershipSeq()).orElse(null);
        if (membership == null) return ResponseEntity.badRequest()
                .body(ApiResponse.error("멤버십을 찾을 수 없습니다."));

        LocalDate startDate = req.getStartDate() != null && !req.getStartDate().isEmpty()
                ? LocalDate.parse(req.getStartDate()) : LocalDate.now();
        LocalDate expiryDate = req.getExpiryDate() != null && !req.getExpiryDate().isEmpty()
                ? LocalDate.parse(req.getExpiryDate()) : startDate.plusDays(membership.getDuration());
        LocalDateTime paymentDate = req.getPaymentDate() != null && !req.getPaymentDate().isEmpty()
                ? LocalDateTime.parse(req.getPaymentDate()) : null;
        MembershipStatus status = MembershipStatus.활성;
        if (req.getStatus() != null && !req.getStatus().isEmpty()) {
            try { status = MembershipStatus.valueOf(req.getStatus()); } catch (IllegalArgumentException ignored) {}
        }

        ComplexMemberMembership mm = ComplexMemberMembership.builder()
                .member(member)
                .membership(membership)
                .startDate(startDate)
                .expiryDate(expiryDate)
                .totalCount(membership.getCount())
                .price(req.getPrice())
                .depositAmount(req.getDepositAmount())
                .paymentMethod(req.getPaymentMethod())
                .paymentDate(paymentDate)
                .status(status)
                .build();

        if (member.getJoinDate() == null) {
            member.setJoinDate(startDate.atStartOfDay());
            memberRepository.save(member);
        }

        return ResponseEntity.ok(ApiResponse.ok("멤버십 할당 완료",
                ComplexMemberMembershipResponse.from(memberMembershipRepository.save(mm))));
    }

    @PutMapping("/{seq}/memberships/{mmSeq}")
    public ResponseEntity<ApiResponse<ComplexMemberMembershipResponse>> updateMembership(
            @PathVariable Long seq, @PathVariable Long mmSeq, @RequestBody ComplexMemberMembershipRequest req) {
        ComplexMemberMembership mm = memberMembershipRepository.findById(mmSeq).orElse(null);
        if (mm == null || !mm.getMember().getSeq().equals(seq)) return ResponseEntity.notFound().build();

        if (req.getStartDate() != null && !req.getStartDate().isEmpty())
            mm.setStartDate(LocalDate.parse(req.getStartDate()));
        if (req.getExpiryDate() != null && !req.getExpiryDate().isEmpty())
            mm.setExpiryDate(LocalDate.parse(req.getExpiryDate()));
        if (req.getPrice() != null) mm.setPrice(req.getPrice());
        if (req.getDepositAmount() != null) mm.setDepositAmount(req.getDepositAmount());
        if (req.getPaymentMethod() != null) mm.setPaymentMethod(req.getPaymentMethod());
        if (req.getPaymentDate() != null && !req.getPaymentDate().isEmpty())
            mm.setPaymentDate(LocalDateTime.parse(req.getPaymentDate()));
        if (req.getStatus() != null && !req.getStatus().isEmpty()) {
            try { mm.setStatus(MembershipStatus.valueOf(req.getStatus())); } catch (IllegalArgumentException ignored) {}
        }
        mm.setLastUpdateDate(LocalDateTime.now());

        return ResponseEntity.ok(ApiResponse.ok("멤버십 수정 완료",
                ComplexMemberMembershipResponse.from(memberMembershipRepository.save(mm))));
    }

    @DeleteMapping("/{seq}/memberships/{mmSeq}")
    public ResponseEntity<ApiResponse<Void>> deleteMembership(@PathVariable Long seq, @PathVariable Long mmSeq) {
        ComplexMemberMembership mm = memberMembershipRepository.findById(mmSeq).orElse(null);
        if (mm == null || !mm.getMember().getSeq().equals(seq)) return ResponseEntity.notFound().build();
        memberMembershipRepository.delete(mm);
        return ResponseEntity.ok(ApiResponse.ok("멤버십 삭제 완료", null));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        memberRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("회원 삭제 완료", null));
    }
}
