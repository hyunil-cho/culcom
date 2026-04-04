package com.culcom.controller.auth;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.auth.LoginRequest;
import com.culcom.dto.auth.SessionInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.auth.UserInfo;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserInfoRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final BranchRepository branchRepository;
    private final UserInfoRepository userInfoRepository;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<SessionInfo>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        return authService.authenticate(request.getUserId(), request.getPassword())
                .map(user -> {
                    Long branchSeq = null;
                    String branchName = null;

                    List<Branch> managedBranches = authService.getManagedBranches(user);
                    if (!managedBranches.isEmpty()) {
                        branchSeq = managedBranches.get(0).getSeq();
                        branchName = managedBranches.get(0).getBranchName();
                    }

                    authService.loginSession(httpRequest, httpResponse, user, branchSeq);

                    var info = SessionInfo.builder()
                            .userSeq(user.getSeq())
                            .userId(user.getUserId())
                            .name(user.getName())
                            .role(user.getRole().name())
                            .selectedBranchSeq(branchSeq)
                            .selectedBranchName(branchName)
                            .build();

                    return ResponseEntity.ok(ApiResponse.ok("로그인 성공", info));
                })
                .orElse(ResponseEntity.status(401).body(ApiResponse.error("아이디 또는 비밀번호가 올바르지 않습니다.")));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<SessionInfo>> me(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("인증되지 않았습니다."));
        }

        Long branchSeq = principal.getSelectedBranchSeq();
        String branchName = null;
        if (branchSeq != null) {
            branchName = branchRepository.findById(branchSeq)
                    .map(Branch::getBranchName).orElse(null);
        }

        var info = SessionInfo.builder()
                .userSeq(principal.getUserSeq())
                .userId(principal.getUserId())
                .name(principal.getName())
                .role(principal.getRole().name())
                .selectedBranchSeq(branchSeq)
                .selectedBranchName(branchName)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(info));
    }

    @PostMapping("/branch/{branchSeq}")
    public ResponseEntity<ApiResponse<Void>> selectBranch(
            @PathVariable Long branchSeq,
            @AuthenticationPrincipal CustomUserPrincipal principal,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        if (!branchRepository.existsById(branchSeq)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("존재하지 않는 지점입니다."));
        }
        if (!UserRole.ROOT.equals(principal.getRole())) {
            UserInfo user = userInfoRepository.findById(principal.getUserSeq())
                    .orElseThrow(() -> new RuntimeException("user not found"));
            List<Long> managedBranchSeqs = authService.getManagedBranches(user).stream()
                    .map(Branch::getSeq).toList();
            if (!managedBranchSeqs.contains(branchSeq)) {
                return ResponseEntity.status(403).body(ApiResponse.error("접근 권한이 없는 지점입니다."));
            }
        }
        authService.updateSelectedBranch(httpRequest, httpResponse, branchSeq);
        return ResponseEntity.ok(ApiResponse.ok("지점 변경 완료", null));
    }
}