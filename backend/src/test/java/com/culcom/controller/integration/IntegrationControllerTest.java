package com.culcom.controller.integration;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.IntegrationService;
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
class IntegrationControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean IntegrationService integrationService;

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

    @Nested
    class ListIntegrations {

        @Test
        void 연동서비스_목록_조회() throws Exception {
            given(integrationService.list(anyLong())).willReturn(List.of());

            mockMvc.perform(get("/api/integrations").with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    class SmsConfig {

        @Test
        void SMS설정_조회() throws Exception {
            given(integrationService.getSmsConfig(anyLong())).willReturn(null);

            mockMvc.perform(get("/api/integrations/sms-config").with(auth()))
                    .andExpect(status().isOk());
        }

        @Test
        void SMS설정_저장_성공() throws Exception {
            willDoNothing().given(integrationService).saveSmsConfig(any(), anyLong());

            mockMvc.perform(post("/api/integrations/sms-config")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "serviceId", 1, "accountId", "acc123",
                                    "password", "pass", "senderPhone", "01012345678",
                                    "active", true))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("SMS 설정이 저장되었습니다."));
        }

        @Test
        void SMS설정_저장시_accountId_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/integrations/sms-config")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "serviceId", 1, "accountId", "",
                                    "password", "pass", "senderPhone", "010"))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void SMS설정_저장시_password_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/integrations/sms-config")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "serviceId", 1, "accountId", "acc",
                                    "password", "", "senderPhone", "010"))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void SMS설정_저장시_senderPhone_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/integrations/sms-config")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "serviceId", 1, "accountId", "acc",
                                    "password", "pass", "senderPhone", ""))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void SMS설정_저장_실패시_에러메시지() throws Exception {
            willThrow(new IllegalArgumentException("유효하지 않은 설정입니다."))
                    .given(integrationService).saveSmsConfig(any(), anyLong());

            mockMvc.perform(post("/api/integrations/sms-config")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "serviceId", 1, "accountId", "acc",
                                    "password", "pass", "senderPhone", "010",
                                    "active", true))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(false));
        }
    }

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/integrations"))
                .andExpect(status().isUnauthorized());
    }
}
