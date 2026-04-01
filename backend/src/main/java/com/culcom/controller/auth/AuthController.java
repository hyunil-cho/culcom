package com.culcom.controller.auth;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.auth.LoginRequest;
import com.culcom.dto.auth.SessionInfo;
import com.culcom.entity.Branch;
import com.culcom.entity.enums.UserRole;
import com.culcom.repository.BranchRepository;
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

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<SessionInfo>> login(
            @Valid @RequestBody LoginRequest request,
            HttpSession session) {

        return authService.authenticate(request.getUserId(), request.getPassword())
                .map(user -> {
                    authService.loginSession(session, user);

                    Long branchSeq = null;
                    String branchName = null;

                    if (user.getRole() == UserRole.ROOT) {
                        // ROOT: 전체 지점 중 첫 번째 자동 선택
                        var branches = branchRepository.findAll();
                        if (!branches.isEmpty()) {
                            branchSeq = branches.get(0).getSeq();
                            branchName = branches.get(0).getBranchName();
                        }
                    } else {
                        // BRANCH_MANAGER / STAFF: 할당된 지점 중 첫 번째 자동 선택
                        var userBranches = user.getBranches();
                        if (!userBranches.isEmpty()) {
                            branchSeq = userBranches.get(0).getSeq();
                            branchName = userBranches.get(0).getBranchName();
                        }
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
        Long userSeq = (Long) session.getAttribute("userSeq");
        if (userSeq == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("인증되지 않았습니다."));
        }

        Long branchSeq = (Long) session.getAttribute("selectedBranchSeq");
        String branchName = null;
        if (branchSeq != null) {
            branchName = branchRepository.findById(branchSeq)
                    .map(Branch::getBranchName).orElse(null);
        }

        var info = SessionInfo.builder()
                .userSeq(userSeq)
                .userId((String) session.getAttribute("userId"))
                .role((String) session.getAttribute("role"))
                .selectedBranchSeq(branchSeq)
                .selectedBranchName(branchName)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(info));
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/branch/{branchSeq}")
    public ResponseEntity<ApiResponse<Void>> selectBranch(
            @PathVariable Long branchSeq, HttpSession session) {
        if (!branchRepository.existsById(branchSeq)) {
            return ResponseEntity.badRequest().body(ApiResponse.error("존재하지 않는 지점입니다."));
        }
        String role = authService.getSessionRole(session);
        if (!UserRole.ROOT.name().equals(role)) {
            // BRANCH_MANAGER / STAFF: 할당된 지점만 전환 가능
            List<Long> branchSeqs = (List<Long>) session.getAttribute("branchSeqs");
            if (branchSeqs == null || !branchSeqs.contains(branchSeq)) {
                return ResponseEntity.status(403).body(ApiResponse.error("접근 권한이 없는 지점입니다."));
            }
        }
        authService.setSelectedBranch(session, branchSeq);
        return ResponseEntity.ok(ApiResponse.ok("지점 변경 완료", null));
    }
}
