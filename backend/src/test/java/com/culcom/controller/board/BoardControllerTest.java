package com.culcom.controller.board;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.dto.board.BoardNoticeResponse;
import com.culcom.entity.enums.NoticeCategory;
import com.culcom.service.BoardSessionService;
import com.culcom.service.BoardSessionService.BoardSessionData;
import com.culcom.service.NoticeService;
import org.mockito.Mockito;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BoardController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class BoardControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean NoticeService noticeService;
    @MockBean BoardSessionService boardSessionService;

    private BoardNoticeResponse sampleNotice(Long seq) {
        return BoardNoticeResponse.builder()
                .seq(seq)
                .branchName("본점")
                .title("공지 제목")
                .content("본문")
                .category(NoticeCategory.스터디시간)
                .categoryClass("badge-notice")
                .isPinned(false)
                .viewCount(10)
                .hasEventDate(false)
                .createdBy("admin")
                .build();
    }

    // ========== GET /notices/{seq} ==========

    @Test
    @DisplayName("공지_상세_조회_성공")
    void 공지_상세_성공() throws Exception {
        given(noticeService.getBoardNoticeDetail(5L)).willReturn(sampleNotice(5L));

        mockMvc.perform(get("/api/public/board/notices/{seq}", 5L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.seq").value(5))
                .andExpect(jsonPath("$.data.title").value("공지 제목"));
    }

    @Test
    @DisplayName("공지_상세_없으면_에러_메시지")
    void 공지_없음() throws Exception {
        given(noticeService.getBoardNoticeDetail(999L)).willReturn(null);

        mockMvc.perform(get("/api/public/board/notices/{seq}", 999L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("스터디시간을 찾을 수 없습니다"));
    }

    // ========== GET /session ==========

    private BoardSessionData loggedIn(long seq, String name) {
        BoardSessionData data = Mockito.mock(BoardSessionData.class);
        given(data.isLoggedIn()).willReturn(true);
        given(data.getMemberSeq()).willReturn(seq);
        given(data.getMemberName()).willReturn(name);
        return data;
    }

    private BoardSessionData loggedOut() {
        BoardSessionData data = Mockito.mock(BoardSessionData.class);
        given(data.isLoggedIn()).willReturn(false);
        return data;
    }

    @Test
    @DisplayName("세션_로그인_상태")
    void 세션_로그인됨() throws Exception {
        BoardSessionData session = loggedIn(42L, "홍길동");
        given(boardSessionService.getSession(any(), any())).willReturn(session);

        mockMvc.perform(get("/api/public/board/session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isLoggedIn").value(true))
                .andExpect(jsonPath("$.data.memberSeq").value(42))
                .andExpect(jsonPath("$.data.memberName").value("홍길동"));
    }

    @Test
    @DisplayName("세션_비로그인_상태")
    void 세션_비로그인() throws Exception {
        BoardSessionData session = loggedOut();
        given(boardSessionService.getSession(any(), any())).willReturn(session);

        mockMvc.perform(get("/api/public/board/session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isLoggedIn").value(false));
    }

    // ========== POST /logout ==========

    @Test
    @DisplayName("로그아웃")
    void 로그아웃() throws Exception {
        willDoNothing().given(boardSessionService).logout(any());

        mockMvc.perform(post("/api/public/board/logout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("로그아웃 완료"));

        verify(boardSessionService).logout(any());
    }
}
