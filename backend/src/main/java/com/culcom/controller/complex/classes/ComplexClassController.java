package com.culcom.controller.complex.classes;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.complex.classes.ComplexClassLeaderRequest;
import com.culcom.dto.complex.classes.ComplexClassRequest;
import com.culcom.dto.complex.classes.ComplexClassResponse;
import com.culcom.dto.complex.member.ComplexMemberResponse;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.service.ComplexClassService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complex/classes")
@RequiredArgsConstructor
public class ComplexClassController {

    private final ComplexClassService complexClassService;

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexClassResponse>> get(@PathVariable Long seq) {
        ComplexClassResponse result = complexClassService.get(seq);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ComplexClassResponse>> create(
            @Valid @RequestBody ComplexClassRequest req, @AuthenticationPrincipal CustomUserPrincipal principal) {
        ComplexClassResponse result = complexClassService.create(req, principal.getSelectedBranchSeq());
        return ResponseEntity.ok(ApiResponse.ok("수업 추가 완료", result));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<ComplexClassResponse>> update(
            @PathVariable Long seq, @Valid @RequestBody ComplexClassRequest req) {
        ComplexClassResponse result = complexClassService.update(seq, req);
        return ResponseEntity.ok(ApiResponse.ok("수업 수정 완료", result));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq) {
        complexClassService.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("수업 삭제 완료", null));
    }

    @GetMapping("/{seq}/members")
    public ResponseEntity<ApiResponse<List<ComplexMemberResponse>>> listMembers(@PathVariable Long seq) {
        List<ComplexMemberResponse> result = complexClassService.listMembers(seq);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/{seq}/members/{memberSeq}")
    public ResponseEntity<ApiResponse<Void>> addMember(@PathVariable Long seq, @PathVariable Long memberSeq) {
        complexClassService.addMember(seq, memberSeq);
        return ResponseEntity.ok(ApiResponse.ok("팀에 멤버 추가 완료", null));
    }

    @DeleteMapping("/{seq}/members/{memberSeq}")
    public ResponseEntity<ApiResponse<Void>> removeMember(@PathVariable Long seq, @PathVariable Long memberSeq) {
        complexClassService.removeMember(seq, memberSeq);
        return ResponseEntity.ok(ApiResponse.ok("팀에서 멤버 제외 완료", null));
    }

    @PutMapping("/{seq}/leader")
    public ResponseEntity<ApiResponse<ComplexClassResponse>> setLeader(
            @PathVariable Long seq, @RequestBody ComplexClassLeaderRequest req) {
        ComplexClassResponse result = complexClassService.setLeader(seq, req.getStaffSeq());
        return ResponseEntity.ok(ApiResponse.ok("리더 변경 완료", result));
    }
}
