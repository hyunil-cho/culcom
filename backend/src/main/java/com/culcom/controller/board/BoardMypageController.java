package com.culcom.controller.board;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.board.BoardMypageResponse;
import com.culcom.entity.customer.Customer;
import com.culcom.service.BoardSessionService;
import com.culcom.service.BoardSessionService.BoardSessionData;
import com.culcom.service.CustomerService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.culcom.util.DateTimeUtils;

@RestController
@RequestMapping("/api/public/board")
@RequiredArgsConstructor
public class BoardMypageController {

    private final CustomerService customerService;
    private final BoardSessionService boardSessionService;

    @GetMapping("/mypage")
    public ResponseEntity<ApiResponse<BoardMypageResponse>> getMypage(
            HttpServletRequest request, HttpServletResponse response) {
        BoardSessionData session = boardSessionService.getSession(request, response);
        if (!session.isLoggedIn()) {
            return ResponseEntity.ok(ApiResponse.error("로그인이 필요합니다"));
        }

        Customer customer = customerService.findById(session.getMemberSeq());
        if (customer == null) {
            return ResponseEntity.ok(ApiResponse.error("회원 정보를 찾을 수 없습니다"));
        }

        BoardMypageResponse mypageResponse = BoardMypageResponse.builder()
                .name(customer.getName())
                .phoneNumber(customer.getPhoneNumber())
                .createdDate(DateTimeUtils.formatDate(customer.getCreatedDate()))
                .loginMethod("카카오 로그인")
                .build();
        return ResponseEntity.ok(ApiResponse.ok(mypageResponse));
    }

    @PostMapping("/withdraw")
    public ResponseEntity<ApiResponse<Void>> withdraw(
            HttpServletRequest request, HttpServletResponse response) {
        BoardSessionData session = boardSessionService.getSession(request, response);
        if (!session.isLoggedIn()) {
            return ResponseEntity.ok(ApiResponse.error("로그인이 필요합니다"));
        }

        Customer customer = customerService.findById(session.getMemberSeq());
        if (customer == null) {
            return ResponseEntity.ok(ApiResponse.error("회원 정보를 찾을 수 없습니다"));
        }

        customerService.delete(session.getMemberSeq());
        boardSessionService.logout(response);
        return ResponseEntity.ok(ApiResponse.<Void>ok("회원탈퇴가 완료되었습니다", null));
    }
}
