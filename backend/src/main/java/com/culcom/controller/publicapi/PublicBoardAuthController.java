package com.culcom.controller.publicapi;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.board.BoardAccountResponse;
import com.culcom.dto.board.BoardLoginRequest;
import com.culcom.dto.board.BoardSignupRequest;
import com.culcom.entity.board.BoardAccount;
import com.culcom.service.BoardAccountService;
import com.culcom.service.BoardSessionService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/board")
@RequiredArgsConstructor
@Slf4j
public class PublicBoardAuthController {

    private final BoardAccountService boardAccountService;
    private final BoardSessionService boardSessionService;

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<BoardAccountResponse>> signup(
            @Valid @RequestBody BoardSignupRequest request,
            HttpServletResponse response) {
        try {
            BoardAccount account = boardAccountService.signup(request);
            Long customerSeq = account.getCustomer() != null ? account.getCustomer().getSeq() : account.getSeq();
            boardSessionService.login(response, customerSeq, account.getName());
            return ResponseEntity.ok(ApiResponse.ok("회원가입 완료", BoardAccountResponse.from(account)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("보드 회원가입 실패", e);
            return ResponseEntity.ok(ApiResponse.error("회원가입 처리 중 오류가 발생했습니다"));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<BoardAccountResponse>> login(
            @Valid @RequestBody BoardLoginRequest request,
            HttpServletResponse response) {
        try {
            BoardAccount account = boardAccountService.login(request);
            Long customerSeq = account.getCustomer() != null ? account.getCustomer().getSeq() : account.getSeq();
            boardSessionService.login(response, customerSeq, account.getName());
            return ResponseEntity.ok(ApiResponse.ok("로그인 성공", BoardAccountResponse.from(account)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("보드 로그인 실패", e);
            return ResponseEntity.ok(ApiResponse.error("로그인 처리 중 오류가 발생했습니다"));
        }
    }
}
