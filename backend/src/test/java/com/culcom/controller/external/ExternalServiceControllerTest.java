package com.culcom.controller.external;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.integration.SmsSendResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.SmsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
@WebMvcTest(ExternalServiceController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class ExternalServiceControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean SmsService smsService;

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
    class SendSms {

        @Test
        void SMS_발송_성공() throws Exception {
            SmsSendResponse response = SmsSendResponse.builder()
                    .success(true).message("발송 성공").cols("99").msgType("SMS").build();

            given(smsService.sendByBranch(anyLong(), anyString(), anyString(), anyString(), any()))
                    .willReturn(response);

            mockMvc.perform(post("/api/external/sms/send")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "senderPhone", "01012345678",
                                    "receiverPhone", "01098765432",
                                    "message", "테스트 메시지"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        void SMS_발송_실패시_에러메시지() throws Exception {
            SmsSendResponse response = SmsSendResponse.builder()
                    .success(false).message("잔여 건수 부족").build();

            given(smsService.sendByBranch(anyLong(), anyString(), anyString(), anyString(), any()))
                    .willReturn(response);

            mockMvc.perform(post("/api/external/sms/send")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "senderPhone", "010", "receiverPhone", "010",
                                    "message", "테스트"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        void SMS_발송시_senderPhone_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/external/sms/send")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "senderPhone", "",
                                    "receiverPhone", "010",
                                    "message", "테스트"))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void SMS_발송시_receiverPhone_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/external/sms/send")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "senderPhone", "010",
                                    "receiverPhone", "",
                                    "message", "테스트"))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void SMS_발송시_message_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/external/sms/send")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "senderPhone", "010",
                                    "receiverPhone", "010",
                                    "message", ""))))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(post("/api/external/sms/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
