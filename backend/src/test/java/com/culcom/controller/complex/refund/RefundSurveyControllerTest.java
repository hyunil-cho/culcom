package com.culcom.controller.complex.refund;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.refund.RefundSurveyResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.RefundSurveyQueryMapper;
import com.culcom.service.RefundSurveyService;
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
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RefundSurveyController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class RefundSurveyControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean RefundSurveyQueryMapper refundSurveyQueryMapper;
    @MockBean RefundSurveyService refundSurveyService;

    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, 8L);
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    private RefundSurveyResponse sample(long seq, String name) {
        return RefundSurveyResponse.builder()
                .seq(seq).refundRequestSeq(seq * 10)
                .memberName(name).phoneNumber("01012345678")
                .belongingScore(5).reEnrollScore(3)
                .build();
    }

    @Test
    @DisplayName("환불설문_목록_기본")
    void 목록_기본() throws Exception {
        given(refundSurveyQueryMapper.search(anyLong(), any(), anyInt(), anyInt()))
                .willReturn(List.of(sample(1L, "홍길동")));
        given(refundSurveyQueryMapper.count(anyLong(), any())).willReturn(1);

        mockMvc.perform(get("/api/complex/refund-surveys").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1));

        verify(refundSurveyQueryMapper).search(eq(8L), isNull(), eq(0), eq(20));
    }

    @Test
    @DisplayName("환불설문_키워드_페이지")
    void 키워드() throws Exception {
        given(refundSurveyQueryMapper.search(anyLong(), any(), anyInt(), anyInt())).willReturn(List.of());
        given(refundSurveyQueryMapper.count(anyLong(), any())).willReturn(0);

        mockMvc.perform(get("/api/complex/refund-surveys")
                        .with(auth())
                        .param("keyword", "홍")
                        .param("page", "2")
                        .param("size", "5"))
                .andExpect(status().isOk());

        verify(refundSurveyQueryMapper).search(eq(8L), eq("홍"), eq(10), eq(5));
    }

    @Test
    @DisplayName("환불설문_단건_조회")
    void 단건_조회() throws Exception {
        given(refundSurveyService.getDetail(5L)).willReturn(sample(5L, "김철수"));

        mockMvc.perform(get("/api/complex/refund-surveys/{seq}", 5L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.seq").value(5))
                .andExpect(jsonPath("$.data.memberName").value("김철수"));
    }

    @Test
    @DisplayName("환불설문_단건_없음_에러")
    void 단건_없음() throws Exception {
        willThrow(new IllegalArgumentException("설문 응답을 찾을 수 없습니다."))
                .given(refundSurveyService).getDetail(99L);

        mockMvc.perform(get("/api/complex/refund-surveys/{seq}", 99L).with(auth()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("설문 응답을 찾을 수 없습니다."));
    }

    @Test
    @DisplayName("환불요청_기준_조회_존재")
    void refund_기준_조회() throws Exception {
        given(refundSurveyService.getByRefundRequest(77L))
                .willReturn(Optional.of(sample(5L, "김철수")));

        mockMvc.perform(get("/api/complex/refund-surveys/by-refund/{refundRequestSeq}", 77L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.seq").value(5));
    }

    @Test
    @DisplayName("환불요청_기준_조회_없으면_null_data")
    void refund_기준_없음() throws Exception {
        given(refundSurveyService.getByRefundRequest(99L)).willReturn(Optional.empty());

        mockMvc.perform(get("/api/complex/refund-surveys/by-refund/{refundRequestSeq}", 99L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    @DisplayName("인증없으면_401")
    void 인증없음() throws Exception {
        mockMvc.perform(get("/api/complex/refund-surveys")).andExpect(status().isUnauthorized());
    }
}
