package com.culcom.controller.branch;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.branch.BranchCreateRequest;
import com.culcom.dto.branch.BranchDetailResponse;
import com.culcom.dto.branch.BranchListResponse;
import com.culcom.entity.Branch;
import com.culcom.entity.UserInfo;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserInfoRepository;
import com.culcom.service.AuthService;
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

    private final BranchRepository branchRepository;
    private final UserInfoRepository userInfoRepository;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BranchListResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        UserInfo user = userInfoRepository.findById(principal.getUserSeq())
                .orElseThrow(() -> new RuntimeException("user not found"));
        List<Branch> branches = authService.getManagedBranches(user);
        List<BranchListResponse> result = branches.stream().map(BranchListResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<BranchDetailResponse>> get(@PathVariable Long seq) {
        return branchRepository.findById(seq)
                .map(b -> ResponseEntity.ok(ApiResponse.ok(BranchDetailResponse.from(b))))
                .orElse(ResponseEntity.notFound().build());
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

        UserInfo manager = userInfoRepository.findById(principal.getUserSeq())
                .orElseThrow(() -> new RuntimeException("user not found"));

        Branch branch = Branch.builder()
                .branchName(request.getBranchName())
                .alias(request.getAlias())
                .branchManager(request.getBranchManager())
                .address(request.getAddress())
                .directions(request.getDirections())
                .createdBy(manager)
                .build();
        Branch saved = branchRepository.save(branch);

        // 선택된 지점이 없으면 자동 선택
        if (principal.getSelectedBranchSeq() == null) {
            authService.updateSelectedBranch(httpRequest, httpResponse, saved.getSeq());
        }

        return ResponseEntity.ok(ApiResponse.ok("지점 추가 완료",
                BranchDetailResponse.from(saved)));
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<BranchDetailResponse>> update(
            @PathVariable Long seq, @RequestBody BranchCreateRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        if (!UserRole.BRANCH_MANAGER.equals(principal.getRole())) {
            return ResponseEntity.status(403).body(ApiResponse.error("지점 수정 권한이 없습니다."));
        }
        return branchRepository.findById(seq)
                .map(branch -> {
                    branch.setBranchName(request.getBranchName());
                    branch.setAlias(request.getAlias());
                    branch.setBranchManager(request.getBranchManager());
                    branch.setAddress(request.getAddress());
                    branch.setDirections(request.getDirections());
                    return ResponseEntity.ok(ApiResponse.ok("지점 수정 완료",
                            BranchDetailResponse.from(branchRepository.save(branch))));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        if (!UserRole.BRANCH_MANAGER.equals(principal.getRole())) {
            return ResponseEntity.status(403).body(ApiResponse.error("지점 삭제 권한이 없습니다."));
        }
        branchRepository.deleteById(seq);
        return ResponseEntity.ok(ApiResponse.ok("지점 삭제 완료", null));
    }
}