package com.culcom.controller.publicapi;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.entity.enums.UserRole;
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

import com.culcom.service.PublicSurveyService;

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
@WebMvcTest(PublicSurveyController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class PublicSurveyControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean PublicSurveyService publicSurveyService;

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

    @Test
    @DisplayName("설문_제출_성공")
    void 설문_제출_성공() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "홍길동");
        body.put("phoneNumber", "01012345678");
        body.put("templateSeq", 1);
        body.put("gender", "남");
        body.put("answers", Map.of("q1", "답변1"));

        willDoNothing().given(publicSurveyService).submit(any());

        mockMvc.perform(post("/api/public/survey/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("설문_제출시_name_빈값이면_400")
    void 설문_제출시_name_빈값이면_400() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "");
        body.put("phoneNumber", "01012345678");

        mockMvc.perform(post("/api/public/survey/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("이름은 필수입니다."));
    }

    @Test
    @DisplayName("설문_제출시_phoneNumber_빈값이면_400")
    void 설문_제출시_phoneNumber_빈값이면_400() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "홍길동");
        body.put("phoneNumber", "");

        mockMvc.perform(post("/api/public/survey/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("연락처는 필수입니다."));
    }

    @Test
    @DisplayName("인증_없이도_접근_가능")
    void 인증_없이도_접근_가능() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "홍길동");
        body.put("phoneNumber", "01012345678");

        willDoNothing().given(publicSurveyService).submit(any());

        mockMvc.perform(post("/api/public/survey/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk());
    }
}
