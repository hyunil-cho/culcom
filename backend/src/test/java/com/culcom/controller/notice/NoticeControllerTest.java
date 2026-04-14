package com.culcom.controller.notice;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.notice.NoticeDetailResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.NoticeQueryMapper;
import com.culcom.service.NoticeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NoticeControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean NoticeService noticeService;
    @MockBean NoticeQueryMapper noticeQueryMapper;

    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, 1L);
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_ROOT")));
        return authentication(token);
    }

    private NoticeDetailResponse sampleNotice() {
        return NoticeDetailResponse.builder()
                .seq(1L).title("공지제목").content("공지내용")
                .category("일반").isPinned(false).isActive(true)
                .viewCount(0).createdBy("관리자").build();
    }

    // ========== 목록 조회 (QueryController) ==========

    @Nested
    class ListNotices {

        @Test
        void 공지사항_목록_페이징_조회() throws Exception {
            given(noticeQueryMapper.search(anyLong(), anyString(), any(), anyInt(), anyInt()))
                    .willReturn(List.of());
            given(noticeQueryMapper.count(anyLong(), anyString(), any()))
                    .willReturn(0);

            mockMvc.perform(get("/api/notices")
                            .param("page", "0").param("size", "10")
                            .with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    // ========== 상세 조회 ==========

    @Nested
    class GetNotice {

        @Test
        void 공지사항_상세_조회_성공() throws Exception {
            given(noticeService.get(1L)).willReturn(sampleNotice());

            mockMvc.perform(get("/api/notices/{seq}", 1L).with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.title").value("공지제목"));
        }
    }

    // ========== 생성 ==========

    @Nested
    class Create {

        @Test
        void 공지사항_생성_성공() throws Exception {
            given(noticeService.create(any(), anyLong())).willReturn(sampleNotice());

            mockMvc.perform(post("/api/notices")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "title", "공지제목",
                                    "content", "공지내용",
                                    "category", "일반"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("공지사항이 등록되었습니다."));
        }

        @Test
        void 공지사항_생성시_title_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/notices")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "title", "", "content", "내용", "category", "일반"))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void 공지사항_생성시_content_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/notices")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "title", "제목", "content", "", "category", "일반"))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void 공지사항_생성시_category_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/notices")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "title", "제목", "content", "내용", "category", ""))))
                    .andExpect(status().isBadRequest());
        }
    }

    // ========== 수정 ==========

    @Nested
    class Update {

        @Test
        void 공지사항_수정_성공() throws Exception {
            given(noticeService.update(anyLong(), any())).willReturn(sampleNotice());

            mockMvc.perform(put("/api/notices/{seq}", 1L)
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "title", "수정제목", "content", "수정내용"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("공지사항이 수정되었습니다."));
        }
    }

    // ========== 삭제 ==========

    @Nested
    class Delete {

        @Test
        void 공지사항_삭제_성공() throws Exception {
            willDoNothing().given(noticeService).delete(1L);

            mockMvc.perform(delete("/api/notices/{seq}", 1L).with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("공지사항이 삭제되었습니다."));
        }
    }

    // ========== 인증 ==========

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/notices/{seq}", 1L))
                .andExpect(status().isUnauthorized());
    }
}
