package com.culcom.controller.board;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.board.BoardNoticeResponse;
import com.culcom.dto.board.BoardSessionResponse;
import com.culcom.service.BoardSessionService;
import com.culcom.service.BoardSessionService.BoardSessionData;
import com.culcom.service.NoticeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/board")
@RequiredArgsConstructor
public class BoardController {

    private final NoticeService noticeService;
    private final BoardSessionService boardSessionService;

    @GetMapping("/notices/{seq}")
    public ResponseEntity<ApiResponse<BoardNoticeResponse>> getNoticeDetail(@PathVariable Long seq) {
        BoardNoticeResponse result = noticeService.getBoardNoticeDetail(seq);
        if (result == null) {
            return ResponseEntity.ok(ApiResponse.error("공지사항을 찾을 수 없습니다"));
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/session")
    public ResponseEntity<ApiResponse<BoardSessionResponse>> getSession(
            HttpServletRequest request, HttpServletResponse response) {
        BoardSessionData data = boardSessionService.getSession(request, response);

        BoardSessionResponse sessionResponse = BoardSessionResponse.builder()
                .isLoggedIn(data.isLoggedIn())
                .memberName(data.getMemberName())
                .memberSeq(data.getMemberSeq())
                .build();

        return ResponseEntity.ok(ApiResponse.ok(sessionResponse));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletResponse response) {
        boardSessionService.logout(response);
        return ResponseEntity.ok(ApiResponse.ok("로그아웃 완료", null));
    }
}
