package com.culcom.controller;

import com.culcom.dto.ApiResponse;
import com.culcom.entity.ComplexMember;
import com.culcom.entity.ComplexMemberMembership;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexMemberRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ComplexMember>>> list(
            HttpSession session,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword) {

        Long branchSeq = authService.getSessionBranchSeq(session);
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdDate"));

        Page<ComplexMember> result;
        if (keyword != null && !keyword.isBlank()) {
            result = memberRepository.searchByBranchSeq(branchSeq, keyword, pageable);
        } else {
            result = memberRepository.findByBranchSeq(branchSeq, pageable);
        }

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexMember>> get(@PathVariable Long seq) {
        return memberRepository.findById(seq)
                .map(m -> ResponseEntity.ok(ApiResponse.ok(m)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{seq}/memberships")
    public ResponseEntity<ApiResponse<List<ComplexMemberMembership>>> getMemberships(@PathVariable Long seq) {
        return ResponseEntity.ok(ApiResponse.ok(memberMembershipRepository.findByMemberSeq(seq)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ComplexMember>> create(
            @RequestBody ComplexMember member, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);
        branchRepository.findById(branchSeq).ifPresent(member::setBranch);
        return ResponseEntity.ok(ApiResponse.ok("회원 추가 완료", memberRepository.save(member)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexMember>> update(
            @PathVariable Long seq, @RequestBody ComplexMember request) {
        return memberRepository.findById(seq)
                .map(member -> {
                    member.setName(request.getName());
                    member.setPhoneNumber(request.getPhoneNumber());
                    member.setLevel(request.getLevel());
                    member.setLanguage(request.getLanguage());
                    member.setInfo(request.getInfo());
                    member.setChartNumber(request.getChartNumber());
                    member.setComment(request.getComment());
                    member.setSignupChannel(request.getSignupChannel());
                    member.setInterviewer(request.getInterviewer());
                    return ResponseEntity.ok(ApiResponse.ok("회원 수정 완료", memberRepository.save(member)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        memberRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("회원 삭제 완료", null));
    }
}
