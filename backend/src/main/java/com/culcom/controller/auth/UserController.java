package com.culcom.controller.auth;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.ApiResponse;
import com.culcom.dto.auth.PasswordChangeRequest;
import com.culcom.dto.auth.UserCreateRequest;
import com.culcom.dto.auth.UserResponse;
import com.culcom.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> list(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        List<UserResponse> result = userService.list(principal.getUserSeq(), principal.getRole());
        if (result == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("사용자 조회 권한이 없습니다."));
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{seq}")
    public ResponseEntity<ApiResponse<UserResponse>> get(
            @PathVariable Long seq,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        try {
            return ResponseEntity.ok(ApiResponse.ok(userService.get(seq, principal.getUserSeq())));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> create(
            @Valid @RequestBody UserCreateRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        try {
            UserResponse result = userService.create(request, principal.getUserSeq(), principal.getRole());
            return ResponseEntity.ok(ApiResponse.ok("사용자 생성 완료", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{seq}")
    public ResponseEntity<ApiResponse<UserResponse>> update(
            @PathVariable Long seq, @RequestBody UserCreateRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        try {
            UserResponse result = userService.update(seq, request, principal.getUserSeq());
            return ResponseEntity.ok(ApiResponse.ok("사용자 수정 완료", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ApiResponse.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{seq}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long seq,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        try {
            userService.delete(seq, principal.getUserSeq());
            return ResponseEntity.ok(ApiResponse.ok("사용자 삭제 완료", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changeMyPassword(
            @Valid @RequestBody PasswordChangeRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("인증되지 않았습니다."));
        }
        try {
            userService.changeOwnPassword(principal.getUserSeq(), request);
            return ResponseEntity.ok(ApiResponse.ok("비밀번호가 변경되었습니다.", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
