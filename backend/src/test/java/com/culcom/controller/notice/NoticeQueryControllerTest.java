package com.culcom.controller.notice;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.notice.NoticeListResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.NoticeQueryMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NoticeQueryController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class NoticeQueryControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean NoticeQueryMapper noticeQueryMapper;

    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, 2L);
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    @Test
    @DisplayName("공지_목록_기본")
    void 기본() throws Exception {
        NoticeListResponse r = NoticeListResponse.builder().seq(1L).title("공지").build();
        given(noticeQueryMapper.search(anyLong(), anyString(), any(), anyInt(), anyInt()))
                .willReturn(List.of(r));
        given(noticeQueryMapper.count(anyLong(), anyString(), any())).willReturn(1);

        mockMvc.perform(get("/api/notices").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)));

        verify(noticeQueryMapper).search(eq(2L), eq("all"), isNull(), eq(0), eq(10));
    }

    @Test
    @DisplayName("공지_목록_필터_검색")
    void 필터() throws Exception {
        given(noticeQueryMapper.search(anyLong(), anyString(), any(), anyInt(), anyInt())).willReturn(List.of());
        given(noticeQueryMapper.count(anyLong(), anyString(), any())).willReturn(0);

        mockMvc.perform(get("/api/notices")
                        .with(auth())
                        .param("filter", "event")
                        .param("searchKeyword", "공지")
                        .param("page", "1")
                        .param("size", "5"))
                .andExpect(status().isOk());

        verify(noticeQueryMapper).search(eq(2L), eq("event"), eq("공지"), eq(5), eq(5));
    }

    @Test
    @DisplayName("인증없으면_401")
    void 인증없음() throws Exception {
        mockMvc.perform(get("/api/notices")).andExpect(status().isUnauthorized());
    }
}
