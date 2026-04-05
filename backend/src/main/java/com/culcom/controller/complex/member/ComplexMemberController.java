package com.culcom.controller.complex.member;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.member.ComplexMemberMembershipRequest;
import com.culcom.dto.complex.member.ComplexMemberMembershipResponse;
import com.culcom.dto.complex.member.ComplexMemberRequest;
import com.culcom.dto.complex.member.ComplexMemberResponse;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.service.ComplexMemberService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/members")
@RequiredArgsConstructor
public class ComplexMemberController {

    private final ComplexMemberService complexMemberService;

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexMemberResponse>> get(@PathVariable Long seq) {
        return ResponseEntity.ok(ApiResponse.ok(complexMemberService.get(seq)));
    }

    @GetMapping("/{seq}/memberships")
    public ResponseEntity<ApiResponse<List<ComplexMemberMembershipResponse>>> getMemberships(@PathVariable Long seq) {
        return ResponseEntity.ok(ApiResponse.ok(complexMemberService.getMemberships(seq)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ComplexMemberResponse>> create(
            @Valid @RequestBody ComplexMemberRequest req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        Long branchSeq = principal.getSelectedBranchSeq();
        return ResponseEntity.ok(ApiResponse.ok("회원 추가 완료", complexMemberService.create(req, branchSeq)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexMemberResponse>> update(
            @PathVariable Long seq, @RequestBody ComplexMemberRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("회원 수정 완료", complexMemberService.update(seq, req)));
    }

    @PostMapping("/{seq}/memberships")
    public ResponseEntity<ApiResponse<ComplexMemberMembershipResponse>> assignMembership(
            @PathVariable Long seq, @Valid @RequestBody ComplexMemberMembershipRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("멤버십 할당 완료", complexMemberService.assignMembership(seq, req)));
    }

    @PutMapping("/{seq}/memberships/{mmSeq}")
    public ResponseEntity<ApiResponse<ComplexMemberMembershipResponse>> updateMembership(
            @PathVariable Long seq, @PathVariable Long mmSeq, @Valid @RequestBody ComplexMemberMembershipRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("멤버십 수정 완료", complexMemberService.updateMembership(seq, mmSeq, req)));
    }

    @DeleteMapping("/{seq}/memberships/{mmSeq}")
    public ResponseEntity<ApiResponse<Void>> deleteMembership(@PathVariable Long seq, @PathVariable Long mmSeq) {
        complexMemberService.deleteMembership(seq, mmSeq);
        return ResponseEntity.ok(ApiResponse.ok("멤버십 삭제 완료", null));
    }

    @PostMapping("/{seq}/class/{classSeq}")
    public ResponseEntity<ApiResponse<Void>> assignClass(
            @PathVariable Long seq, @PathVariable Long classSeq) {
        complexMemberService.assignClass(seq, classSeq);
        return ResponseEntity.ok(ApiResponse.ok("수업 배정 완료", null));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        complexMemberService.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("회원 삭제 완료", null));
    }
}
