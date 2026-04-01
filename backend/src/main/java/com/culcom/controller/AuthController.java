package com.culcom.controller;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.LoginRequest;
import com.culcom.dto.SessionInfo;
import com.culcom.entity.Branch;
import com.culcom.repository.BranchRepository;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

                    // 첫 번째 지점 자동 선택
                    var branches = branchRepository.findAll();
                    Long branchSeq = null;
                    String branchName = null;
                    if (!branches.isEmpty()) {
                        branchSeq = branches.get(0).getSeq();
                        branchName = branches.get(0).getBranchName();
                        authService.setSelectedBranch(session, branchSeq);
                    }

                    var info = SessionInfo.builder()
                            .userSeq(user.getSeq())
                            .userId(user.getUserId())
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
                .selectedBranchSeq(branchSeq)
                .selectedBranchName(branchName)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(info));
    }

    @PostMapping("/branch/{branchSeq}")
    public ResponseEntity<ApiResponse<Void>> selectBranch(
            @PathVariable Long branchSeq, HttpSession session) {
        authService.setSelectedBranch(session, branchSeq);
        return ResponseEntity.ok(ApiResponse.ok("지점 변경 완료", null));
    }
}
