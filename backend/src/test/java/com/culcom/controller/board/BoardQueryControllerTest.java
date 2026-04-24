package com.culcom.controller.board;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.dto.notice.NoticeListResponse;
import com.culcom.mapper.NoticeQueryMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BoardQueryController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class BoardQueryControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean NoticeQueryMapper noticeQueryMapper;

    private NoticeListResponse sample(long seq, String title) {
        NoticeListResponse r = new NoticeListResponse();
        r = NoticeListResponse.builder()
                .seq(seq).branchName("본점").title(title)
                .category("공지사항").isPinned(false).viewCount(1)
                .createdBy("관리자").createdDate("2026-04-01")
                .build();
        return r;
    }

    @Test
    @DisplayName("공지_목록_기본_페이징")
    void 목록_기본() throws Exception {
        given(noticeQueryMapper.searchPublic(anyString(), org.mockito.ArgumentMatchers.any(), anyInt(), anyInt()))
                .willReturn(List.of(sample(1L, "제목1"), sample(2L, "제목2")));
        given(noticeQueryMapper.countPublic(anyString(), org.mockito.ArgumentMatchers.any()))
                .willReturn(2);

        mockMvc.perform(get("/api/public/board/notices"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(2)))
                .andExpect(jsonPath("$.data.totalElements").value(2));

        verify(noticeQueryMapper).searchPublic(eq("all"), isNull(), eq(0), eq(12));
    }

    @Test
    @DisplayName("공지_목록_페이지_사이즈_커스텀")
    void 목록_페이지_커스텀() throws Exception {
        given(noticeQueryMapper.searchPublic(anyString(), org.mockito.ArgumentMatchers.any(), anyInt(), anyInt()))
                .willReturn(List.of());
        given(noticeQueryMapper.countPublic(anyString(), org.mockito.ArgumentMatchers.any()))
                .willReturn(0);

        mockMvc.perform(get("/api/public/board/notices")
                        .param("page", "2")
                        .param("size", "5")
                        .param("filter", "event")
                        .param("q", "새내기"))
                .andExpect(status().isOk());

        ArgumentCaptor<Integer> offset = ArgumentCaptor.forClass(Integer.class);
        ArgumentCaptor<Integer> size = ArgumentCaptor.forClass(Integer.class);
        verify(noticeQueryMapper).searchPublic(eq("event"), eq("새내기"), offset.capture(), size.capture());

        org.assertj.core.api.Assertions.assertThat(offset.getValue()).isEqualTo(10);
        org.assertj.core.api.Assertions.assertThat(size.getValue()).isEqualTo(5);
    }

    @Test
    @DisplayName("검색어_앞뒤_공백_제거")
    void 검색어_trim() throws Exception {
        given(noticeQueryMapper.searchPublic(anyString(), org.mockito.ArgumentMatchers.any(), anyInt(), anyInt()))
                .willReturn(List.of());
        given(noticeQueryMapper.countPublic(anyString(), org.mockito.ArgumentMatchers.any()))
                .willReturn(0);

        mockMvc.perform(get("/api/public/board/notices").param("q", "  키워드  "))
                .andExpect(status().isOk());

        verify(noticeQueryMapper).searchPublic(eq("all"), eq("키워드"), eq(0), eq(12));
    }

    @Test
    @DisplayName("검색어_미전달시_null_처리")
    void 검색어_null() throws Exception {
        given(noticeQueryMapper.searchPublic(anyString(), org.mockito.ArgumentMatchers.any(), anyInt(), anyInt()))
                .willReturn(List.of());
        given(noticeQueryMapper.countPublic(anyString(), org.mockito.ArgumentMatchers.any()))
                .willReturn(0);

        mockMvc.perform(get("/api/public/board/notices"))
                .andExpect(status().isOk());

        verify(noticeQueryMapper).searchPublic(eq("all"), isNull(), eq(0), eq(12));
    }

    @Test
    @DisplayName("인증없이_접근_가능")
    void 인증없이_접근() throws Exception {
        given(noticeQueryMapper.searchPublic(anyString(), org.mockito.ArgumentMatchers.any(), anyInt(), anyInt()))
                .willReturn(List.of());
        given(noticeQueryMapper.countPublic(anyString(), org.mockito.ArgumentMatchers.any()))
                .willReturn(0);

        mockMvc.perform(get("/api/public/board/notices"))
                .andExpect(status().isOk());
    }
}
