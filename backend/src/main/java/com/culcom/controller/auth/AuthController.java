package com.culcom.controller.auth;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.auth.LoginRequest;
import com.culcom.dto.auth.SessionInfo;
import com.culcom.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<SessionInfo>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        SessionInfo info = authService.login(request, httpRequest, httpResponse);
        return ResponseEntity.ok(ApiResponse.ok("로그인 성공", info));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<SessionInfo>> me(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(authService.getCurrentSession(principal)));
    }

    @PostMapping("/branch/{branchSeq}")
    public ResponseEntity<ApiResponse<Void>> selectBranch(
            @PathVariable Long branchSeq,
            @AuthenticationPrincipal CustomUserPrincipal principal,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        authService.selectBranch(branchSeq, principal, httpRequest, httpResponse);
        return ResponseEntity.ok(ApiResponse.ok("지점 변경 완료", null));
    }
}
