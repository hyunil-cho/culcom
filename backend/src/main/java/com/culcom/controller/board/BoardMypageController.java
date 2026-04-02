package com.culcom.controller.board;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.board.BoardMypageResponse;
import com.culcom.repository.CustomerRepository;
import com.culcom.service.BoardSessionService;
import com.culcom.service.BoardSessionService.BoardSessionData;
import com.culcom.service.KakaoOAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/public/board")
@RequiredArgsConstructor
public class BoardMypageController {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final CustomerRepository customerRepository;
    private final BoardSessionService boardSessionService;
    private final KakaoOAuthService kakaoOAuthService;

    @GetMapping("/mypage")
    public ResponseEntity<ApiResponse<BoardMypageResponse>> getMypage(
            HttpServletRequest request, HttpServletResponse response) {
        BoardSessionData session = boardSessionService.getSession(request, response);
        if (!session.isLoggedIn()) {
            return ResponseEntity.ok(ApiResponse.error("로그인이 필요합니다"));
        }

        return customerRepository.findById(session.getMemberSeq())
                .map(customer -> {
                    BoardMypageResponse mypageResponse = BoardMypageResponse.builder()
                            .name(customer.getName())
                            .phoneNumber(customer.getPhoneNumber())
                            .createdDate(customer.getCreatedDate() != null
                                    ? customer.getCreatedDate().format(DATE_FORMATTER) : null)
                            .loginMethod("카카오 로그인")
                            .build();
                    return ResponseEntity.ok(ApiResponse.ok(mypageResponse));
                })
                .orElse(ResponseEntity.ok(ApiResponse.error("회원 정보를 찾을 수 없습니다")));
    }

    @PostMapping("/withdraw")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> withdraw(
            HttpServletRequest request, HttpServletResponse response) {
        BoardSessionData session = boardSessionService.getSession(request, response);
        if (!session.isLoggedIn()) {
            return ResponseEntity.ok(ApiResponse.error("로그인이 필요합니다"));
        }

        return customerRepository.findById(session.getMemberSeq())
                .map(customer -> {
                    Long kakaoId = customer.getKakaoId();
                    customerRepository.delete(customer);
                    customerRepository.flush();
                    kakaoOAuthService.unlinkUser(kakaoId);
                    boardSessionService.logout(response);
                    return ResponseEntity.ok(ApiResponse.<Void>ok("회원탈퇴가 완료되었습니다", null));
                })
                .orElse(ResponseEntity.ok(ApiResponse.error("회원 정보를 찾을 수 없습니다")));
    }
}
