package com.culcom.controller.complex.refund;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.refund.RefundResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.RefundQueryMapper;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RefundQueryController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class RefundQueryControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean RefundQueryMapper refundQueryMapper;

    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, 9L);
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    @Test
    @DisplayName("환불_목록_기본")
    void 기본() throws Exception {
        given(refundQueryMapper.search(anyLong(), any(), any(), anyInt(), anyInt()))
                .willReturn(List.of(RefundResponse.builder().seq(1L).memberName("홍길동").build()));
        given(refundQueryMapper.count(anyLong(), any(), any())).willReturn(1);

        mockMvc.perform(get("/api/complex/refunds").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1));

        verify(refundQueryMapper).search(eq(9L), isNull(), isNull(), eq(0), eq(20));
    }

    @Test
    @DisplayName("환불_목록_상태_키워드")
    void 필터() throws Exception {
        given(refundQueryMapper.search(anyLong(), any(), any(), anyInt(), anyInt())).willReturn(List.of());
        given(refundQueryMapper.count(anyLong(), any(), any())).willReturn(0);

        mockMvc.perform(get("/api/complex/refunds")
                        .with(auth())
                        .param("status", "대기")
                        .param("keyword", "김"))
                .andExpect(status().isOk());

        verify(refundQueryMapper).search(eq(9L), eq("대기"), eq("김"), eq(0), eq(20));
    }

    @Test
    @DisplayName("인증없으면_401")
    void 인증없음() throws Exception {
        mockMvc.perform(get("/api/complex/refunds")).andExpect(status().isUnauthorized());
    }
}
