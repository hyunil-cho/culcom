package com.culcom.controller.external;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
@WebMvcTest(MetaWebhookController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "meta.webhook.verify-token=test-token")
class MetaWebhookControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @Nested
    class Verify {

        @Test
        void 웹훅_인증_성공() throws Exception {
            mockMvc.perform(get("/api/external/meta")
                            .param("hub.mode", "subscribe")
                            .param("hub.verify_token", "test-token")
                            .param("hub.challenge", "abc123"))
                    .andExpect(status().isOk())
                    .andExpect(content().string("abc123"));
        }

        @Test
        void 웹훅_인증_실패_잘못된_토큰() throws Exception {
            mockMvc.perform(get("/api/external/meta")
                            .param("hub.mode", "subscribe")
                            .param("hub.verify_token", "wrong-token")
                            .param("hub.challenge", "abc123"))
                    .andExpect(status().isForbidden())
                    .andExpect(content().string("Verification failed"));
        }

        @Test
        void 웹훅_인증_실패_잘못된_모드() throws Exception {
            mockMvc.perform(get("/api/external/meta")
                            .param("hub.mode", "unsubscribe")
                            .param("hub.verify_token", "test-token")
                            .param("hub.challenge", "abc123"))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    class ReceiveEvent {

        @Test
        void 이벤트_수신_성공() throws Exception {
            mockMvc.perform(post("/api/external/meta")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("object", "page", "entry", java.util.List.of()))))
                    .andExpect(status().isOk())
                    .andExpect(content().string("EVENT_RECEIVED"));
        }
    }
}
