package com.culcom.controller.branch;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.branch.BranchCreateRequest;
import com.culcom.dto.branch.BranchDetailResponse;
import com.culcom.dto.branch.BranchListResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.AuthService;
import com.culcom.service.BranchService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchService branchService;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BranchListResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        List<BranchListResponse> result = branchService.list(principal.getUserSeq());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<BranchDetailResponse>> get(@PathVariable Long seq) {
        BranchDetailResponse result = branchService.get(seq);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BranchDetailResponse>> create(
            @RequestBody BranchCreateRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        if (!UserRole.BRANCH_MANAGER.equals(principal.getRole())) {
            return ResponseEntity.status(403).body(ApiResponse.error("지점 생성 권한이 없습니다."));
        }

        BranchDetailResponse result = branchService.create(request, principal.getUserSeq());

        // 선택된 지점이 없으면 자동 선택
        if (principal.getSelectedBranchSeq() == null) {
            authService.updateSelectedBranch(httpRequest, httpResponse, result.getSeq());
        }

        return ResponseEntity.ok(ApiResponse.ok("지점 추가 완료", result));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<BranchDetailResponse>> update(
            @PathVariable Long seq, @RequestBody BranchCreateRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        if (!UserRole.BRANCH_MANAGER.equals(principal.getRole())) {
            return ResponseEntity.status(403).body(ApiResponse.error("지점 수정 권한이 없습니다."));
        }
        BranchDetailResponse result = branchService.update(seq, request);
        return ResponseEntity.ok(ApiResponse.ok("지점 수정 완료", result));
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        if (!UserRole.BRANCH_MANAGER.equals(principal.getRole())) {
            return ResponseEntity.status(403).body(ApiResponse.error("지점 삭제 권한이 없습니다."));
        }
        branchService.delete(seq);
        return ResponseEntity.ok(ApiResponse.ok("지점 삭제 완료", null));
    }
}
