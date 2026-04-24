package com.culcom.controller.complex.survey;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.survey.SurveyOptionResponse;
import com.culcom.dto.complex.survey.SurveyQuestionResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.SurveyQueryMapper;
import com.culcom.service.SurveyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 기존 {@link SurveyControllerTest}에서 누락되었던 reorderQuestions / 선택지(option) 엔드포인트 커버리지.
 */
@WebMvcTest(SurveyController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class SurveyControllerOptionsTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean SurveyService surveyService;
    @MockBean SurveyQueryMapper surveyQueryMapper;

    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, 1L);
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    private SurveyOptionResponse option(long seq, long templateSeq, long questionSeq, String label, int order) {
        return SurveyOptionResponse.builder()
                .seq(seq).templateSeq(templateSeq).questionSeq(questionSeq)
                .label(label).sortOrder(order)
                .build();
    }

    // ========== 질문 순서 변경 ==========

    @Test
    @DisplayName("질문_순서_변경")
    void 질문_순서변경() throws Exception {
        given(surveyService.reorderQuestions(any()))
                .willReturn(List.of());

        Map<String, Object> body = Map.of("items", List.of(
                Map.of("seq", 10, "sortOrder", 1),
                Map.of("seq", 11, "sortOrder", 2)));

        mockMvc.perform(put("/api/complex/survey/templates/{t}/questions/reorder", 5L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("질문 순서가 변경되었습니다."));

        verify(surveyService).reorderQuestions(any());
    }

    // ========== 선택지 목록 조회 ==========

    @Test
    @DisplayName("선택지_전체_조회_questionSeq_없을때")
    void 선택지_전체() throws Exception {
        given(surveyService.listOptions(eq(5L), isNull()))
                .willReturn(List.of(option(1L, 5L, 10L, "A", 0), option(2L, 5L, 10L, "B", 1)));

        mockMvc.perform(get("/api/complex/survey/templates/{t}/options", 5L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].label").value("A"));

        verify(surveyService).listOptions(eq(5L), isNull());
    }

    @Test
    @DisplayName("선택지_특정_questionSeq_필터")
    void 선택지_필터() throws Exception {
        given(surveyService.listOptions(eq(5L), eq(10L)))
                .willReturn(List.of(option(1L, 5L, 10L, "A", 0)));

        mockMvc.perform(get("/api/complex/survey/templates/{t}/options", 5L)
                        .with(auth())
                        .param("questionSeq", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)));

        verify(surveyService).listOptions(eq(5L), eq(10L));
    }

    // ========== 선택지 추가 ==========

    @Test
    @DisplayName("선택지_추가_성공")
    void 선택지_추가() throws Exception {
        given(surveyService.createOption(eq(5L), any()))
                .willReturn(option(100L, 5L, 10L, "C", 2));

        Map<String, Object> body = Map.of("questionSeq", 10, "label", "C");

        mockMvc.perform(post("/api/complex/survey/templates/{t}/options", 5L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("선택지 추가 완료"))
                .andExpect(jsonPath("$.data.label").value("C"));
    }

    @Test
    @DisplayName("선택지_추가_label_누락_400")
    void 선택지_label_누락() throws Exception {
        Map<String, Object> body = Map.of("questionSeq", 10);

        mockMvc.perform(post("/api/complex/survey/templates/{t}/options", 5L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("선택지_추가_questionSeq_누락_400")
    void 선택지_questionSeq_누락() throws Exception {
        Map<String, Object> body = Map.of("label", "새로운");

        mockMvc.perform(post("/api/complex/survey/templates/{t}/options", 5L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    // ========== 선택지 순서 변경 ==========

    @Test
    @DisplayName("선택지_순서_변경")
    void 선택지_순서변경() throws Exception {
        given(surveyService.reorderOptions(any()))
                .willReturn(List.of(option(1L, 5L, 10L, "A", 0), option(2L, 5L, 10L, "B", 1)));

        Map<String, Object> body = Map.of("items", List.of(
                Map.of("seq", 1, "sortOrder", 0),
                Map.of("seq", 2, "sortOrder", 1)));

        mockMvc.perform(put("/api/complex/survey/templates/{t}/options/reorder", 5L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("선택지 순서가 변경되었습니다."))
                .andExpect(jsonPath("$.data", hasSize(2)));

        verify(surveyService).reorderOptions(any());
    }

    // ========== 선택지 삭제 ==========

    @Test
    @DisplayName("선택지_삭제")
    void 선택지_삭제() throws Exception {
        willDoNothing().given(surveyService).deleteOption(eq(100L));

        mockMvc.perform(delete("/api/complex/survey/templates/{t}/options/{o}", 5L, 100L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("선택지가 삭제되었습니다."));

        verify(surveyService).deleteOption(eq(100L));
    }

    @Test
    @DisplayName("인증없으면_401")
    void 인증없음() throws Exception {
        mockMvc.perform(get("/api/complex/survey/templates/{t}/options", 5L))
                .andExpect(status().isUnauthorized());
    }
}
