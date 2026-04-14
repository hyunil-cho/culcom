package com.culcom.controller.settings;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.SettingsService;
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
class SettingsControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean SettingsService settingsService;

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
    class SmsEvents {

        @Test
        void SMS이벤트_설정_목록_조회() throws Exception {
            given(settingsService.listSmsEventConfigs(anyLong())).willReturn(List.of());

            mockMvc.perform(get("/api/settings/sms-events").with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        void SMS이벤트_설정_저장() throws Exception {
            given(settingsService.saveSmsEventConfig(any(), anyLong())).willReturn(null);

            mockMvc.perform(post("/api/settings/sms-events")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "eventType", "RESERVATION_CONFIRM",
                                    "enabled", true))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("설정이 저장되었습니다"));
        }

        @Test
        void SMS이벤트_설정_삭제() throws Exception {
            willDoNothing().given(settingsService).deleteSmsEventConfig(anyLong(), any());

            mockMvc.perform(delete("/api/settings/sms-events/{eventType}", "RESERVATION_CONFIRM")
                            .with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("설정이 삭제되었습니다"));
        }

        @Test
        void SMS이벤트_템플릿_목록_조회() throws Exception {
            given(settingsService.getTemplates(anyLong())).willReturn(List.of());

            mockMvc.perform(get("/api/settings/sms-events/templates").with(auth()))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/settings/sms-events"))
                .andExpect(status().isUnauthorized());
    }
}
