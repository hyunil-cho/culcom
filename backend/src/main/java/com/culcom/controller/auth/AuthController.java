package com.culcom.controller.auth;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.auth.LoginRequest;
import com.culcom.dto.auth.SessionInfo;
import com.culcom.entity.Branch;
import com.culcom.entity.UserInfo;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.UserInfoRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
            HttpSession session) {

        return authService.authenticate(request.getUserId(), request.getPassword())
                .map(user -> {
                    authService.loginSession(session, user);

                    Long branchSeq = null;
                    String branchName = null;

                    List<Branch> managedBranches = authService.getManagedBranches(user);
                    if (!managedBranches.isEmpty()) {
                        branchSeq = managedBranches.get(0).getSeq();
                        branchName = managedBranches.get(0).getBranchName();
                    }

                    if (branchSeq != null) {
                        authService.setSelectedBranch(session, branchSeq);
                    }

                    var info = SessionInfo.builder()
                            .userSeq(user.getSeq())
                            .userId(user.getUserId())
                            .role(user.getRole().name())
                            .selectedBranchSeq(branchSeq)
                            .selectedBranchName(branchName)
                            .build();

                    return ResponseEntity.ok(ApiResponse.ok("로그인 성공", info));
                })
                .orElse(ResponseEntity.status(401).body(ApiResponse.error("아이디 또는 비밀번호가 올바르지 않습니다.")));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<SessionInfo>> me(HttpSession session) {
        Long userSeq = authService.getSessionUserSeq(session);
        if (userSeq == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("인증되지 않았습니다."));
        }

        UserInfo user = userInfoRepository.findById(userSeq)
                .orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("인증되지 않았습니다."));
        }

        Long branchSeq = authService.getSessionBranchSeq(session);
        String branchName = null;
        if (branchSeq != null) {
            branchName = branchRepository.findById(branchSeq)
                    .map(Branch::getBranchName).orElse(null);
        }

        var info = SessionInfo.builder()
                .userSeq(userSeq)
                .userId(user.getUserId())
                .role(user.getRole().name())
                .selectedBranchSeq(branchSeq)
                .selectedBranchName(branchName)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(info));
    }

    @PostMapping("/branch/{branchSeq}")
    public ResponseEntity<ApiResponse<Void>> selectBranch(
            @PathVariable Long branchSeq, HttpSession session) {
        if (!branchRepository.existsById(branchSeq)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("존재하지 않는 지점입니다."));
        }
        UserRole role = authService.getSessionRole(session);
        if (!UserRole.ROOT.equals(role)) {
            // BRANCH_MANAGER / STAFF: 관리 지점만 전환 가능
            UserInfo user = userInfoRepository.findById(authService.getSessionUserSeq(session))
                    .orElseThrow(() -> new RuntimeException("user not found"));
            List<Long> managedBranchSeqs = authService.getManagedBranches(user).stream()
                    .map(Branch::getSeq).toList();
            if (!managedBranchSeqs.contains(branchSeq)) {
                return ResponseEntity.status(403).body(ApiResponse.error("접근 권한이 없는 지점입니다."));
            }
        }
        authService.setSelectedBranch(session, branchSeq);
        return ResponseEntity.ok(ApiResponse.ok("지점 변경 완료", null));
    }
}
