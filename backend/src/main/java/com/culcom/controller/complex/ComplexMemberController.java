package com.culcom.controller.complex;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.member.ComplexMemberMembershipResponse;
import com.culcom.dto.complex.member.ComplexMemberRequest;
import com.culcom.dto.complex.member.ComplexMemberResponse;
import com.culcom.entity.complex.member.ComplexMember;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.config.security.CustomUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/members")
@RequiredArgsConstructor
public class ComplexMemberController {

    private final ComplexMemberRepository memberRepository;
    private final ComplexMemberMembershipRepository memberMembershipRepository;
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

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        memberRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("회원 삭제 완료", null));
    }
}
