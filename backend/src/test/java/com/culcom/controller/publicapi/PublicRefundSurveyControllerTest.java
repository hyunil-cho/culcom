package com.culcom.controller.publicapi;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.dto.publicapi.RefundSurveySubmitRequest;
import com.culcom.service.PublicRefundSurveyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PublicRefundSurveyController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class PublicRefundSurveyControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean PublicRefundSurveyService publicRefundSurveyService;

    private RefundSurveySubmitRequest validRequest() {
        RefundSurveySubmitRequest r = new RefundSurveySubmitRequest();
        r.setBranchSeq(1L);
        r.setRefundRequestSeq(10L);
        r.setMemberName("홍길동");
        r.setPhoneNumber("01012345678");
        r.setParticipationPeriod("3개월");
        r.setBelongingScore(5);
        r.setTeamImpact("영향 없음");
        r.setDifferenceComment("차이 없음");
        r.setImprovementComment("개선 필요 없음");
        r.setReEnrollScore(5);
        return r;
    }

    @Test
    @DisplayName("환불설문_제출_성공")
    void 제출_성공() throws Exception {
        willDoNothing().given(publicRefundSurveyService).submit(any());

        mockMvc.perform(post("/api/public/refund-survey/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(publicRefundSurveyService).submit(any());
    }

    @Test
    @DisplayName("환불설문_제출_실패_잘못된인자")
    void 제출_잘못된_인자() throws Exception {
        willThrow(new IllegalArgumentException("유효하지 않은 환불 요청입니다"))
                .given(publicRefundSurveyService).submit(any());

        mockMvc.perform(post("/api/public/refund-survey/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("유효하지 않은 환불 요청입니다"));
    }

    @Test
    @DisplayName("인증없이_접근_가능")
    void 인증없이_접근() throws Exception {
        willDoNothing().given(publicRefundSurveyService).submit(any());

        mockMvc.perform(post("/api/public/refund-survey/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isOk());
    }
}
