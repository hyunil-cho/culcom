package com.culcom.controller.complex.settings;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.settings.ConfigDto;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.BankConfigService;
import com.culcom.service.PaymentMethodConfigService;
import com.culcom.service.SignupChannelConfigService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.*;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
@WebMvcTest({BankConfigController.class, PaymentMethodConfigController.class, SignupChannelConfigController.class})
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class ComplexSettingsControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean BankConfigService bankConfigService;
    @MockBean PaymentMethodConfigService paymentMethodConfigService;
    @MockBean SignupChannelConfigService signupChannelConfigService;

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

    // ========== Banks ==========

    @Nested
    class Banks {

        @Test
        void 은행_목록_조회() throws Exception {
            given(bankConfigService.listAll())
                    .willReturn(List.of(
                            new ConfigDto.Response(1L, "신한은행", true, false),
                            new ConfigDto.Response(2L, "국민은행", true, false)));

            mockMvc.perform(get("/api/complex/settings/banks").with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(2)))
                    .andExpect(jsonPath("$.data[0].code").value("신한은행"));
        }

        @Test
        void 은행_추가() throws Exception {
            given(bankConfigService.create(any()))
                    .willReturn(new ConfigDto.Response(3L, "우리은행", true, false));

            Map<String, Object> body = Map.of("code", "우리은행", "isActive", true);

            mockMvc.perform(post("/api/complex/settings/banks")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("은행 추가 완료"))
                    .andExpect(jsonPath("$.data.code").value("우리은행"));
        }

        @Test
        void 은행_수정() throws Exception {
            given(bankConfigService.update(eq(1L), any()))
                    .willReturn(new ConfigDto.Response(1L, "신한은행", false, false));

            Map<String, Object> body = Map.of("isActive", false);

            mockMvc.perform(put("/api/complex/settings/banks/{seq}", 1L)
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("은행 수정 완료"))
                    .andExpect(jsonPath("$.data.isActive").value(false));
        }

        @Test
        void 은행_삭제() throws Exception {
            willDoNothing().given(bankConfigService).delete(eq(1L));

            mockMvc.perform(delete("/api/complex/settings/banks/{seq}", 1L)
                            .with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("은행 삭제 완료"));
        }
    }

    // ========== PaymentMethods ==========

    @Nested
    class PaymentMethods {

        @Test
        void 결제수단_목록_조회() throws Exception {
            given(paymentMethodConfigService.listAll())
                    .willReturn(List.of(
                            new ConfigDto.Response(1L, "카드", true, false),
                            new ConfigDto.Response(2L, "현금", true, false)));

            mockMvc.perform(get("/api/complex/settings/payment-methods").with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(2)))
                    .andExpect(jsonPath("$.data[0].code").value("카드"));
        }

        @Test
        void 결제수단_추가() throws Exception {
            given(paymentMethodConfigService.create(any()))
                    .willReturn(new ConfigDto.Response(3L, "계좌이체", true, false));

            Map<String, Object> body = Map.of("code", "계좌이체", "isActive", true);

            mockMvc.perform(post("/api/complex/settings/payment-methods")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("결제 수단 추가 완료"))
                    .andExpect(jsonPath("$.data.code").value("계좌이체"));
        }

        @Test
        void 결제수단_수정() throws Exception {
            given(paymentMethodConfigService.update(eq(1L), any()))
                    .willReturn(new ConfigDto.Response(1L, "카드", false, false));

            Map<String, Object> body = Map.of("isActive", false);

            mockMvc.perform(put("/api/complex/settings/payment-methods/{seq}", 1L)
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("결제 수단 수정 완료"))
                    .andExpect(jsonPath("$.data.isActive").value(false));
        }

        @Test
        void 결제수단_삭제() throws Exception {
            willDoNothing().given(paymentMethodConfigService).delete(eq(1L));

            mockMvc.perform(delete("/api/complex/settings/payment-methods/{seq}", 1L)
                            .with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("결제 수단 삭제 완료"));
        }
    }

    // ========== SignupChannels ==========

    @Nested
    class SignupChannels {

        @Test
        void 가입경로_목록_조회() throws Exception {
            given(signupChannelConfigService.listAll())
                    .willReturn(List.of(
                            new ConfigDto.Response(1L, "인터넷 검색", true, false),
                            new ConfigDto.Response(2L, "지인 소개", true, false)));

            mockMvc.perform(get("/api/complex/settings/signup-channels").with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(2)))
                    .andExpect(jsonPath("$.data[0].code").value("인터넷 검색"));
        }

        @Test
        void 가입경로_추가() throws Exception {
            given(signupChannelConfigService.create(any()))
                    .willReturn(new ConfigDto.Response(3L, "SNS 광고", true, false));

            Map<String, Object> body = Map.of("code", "SNS 광고", "isActive", true);

            mockMvc.perform(post("/api/complex/settings/signup-channels")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("가입경로 추가 완료"))
                    .andExpect(jsonPath("$.data.code").value("SNS 광고"));
        }

        @Test
        void 가입경로_수정() throws Exception {
            given(signupChannelConfigService.update(eq(1L), any()))
                    .willReturn(new ConfigDto.Response(1L, "인터넷 검색", false, false));

            Map<String, Object> body = Map.of("isActive", false);

            mockMvc.perform(put("/api/complex/settings/signup-channels/{seq}", 1L)
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("가입경로 수정 완료"))
                    .andExpect(jsonPath("$.data.isActive").value(false));
        }

        @Test
        void 가입경로_삭제() throws Exception {
            willDoNothing().given(signupChannelConfigService).delete(eq(1L));

            mockMvc.perform(delete("/api/complex/settings/signup-channels/{seq}", 1L)
                            .with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("가입경로 삭제 완료"));
        }
    }

    // ========== 인증 ==========

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/complex/settings/banks"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/complex/settings/payment-methods"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/complex/settings/signup-channels"))
                .andExpect(status().isUnauthorized());
    }
}
