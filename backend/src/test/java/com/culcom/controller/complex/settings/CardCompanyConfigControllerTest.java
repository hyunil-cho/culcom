package com.culcom.controller.complex.settings;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.settings.ConfigDto;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.CardCompanyConfigService;
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
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CardCompanyConfigController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class CardCompanyConfigControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean CardCompanyConfigService cardCompanyConfigService;

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
    @DisplayName("카드사_목록_조회")
    void 목록_조회() throws Exception {
        given(cardCompanyConfigService.listAll())
                .willReturn(List.of(
                        new ConfigDto.Response(1L, "BC카드", true, false),
                        new ConfigDto.Response(2L, "삼성카드", true, false)));

        mockMvc.perform(get("/api/complex/settings/card-companies").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].code").value("BC카드"))
                .andExpect(jsonPath("$.data[1].code").value("삼성카드"));
    }

    @Test
    @DisplayName("카드사_추가")
    void 추가() throws Exception {
        given(cardCompanyConfigService.create(any()))
                .willReturn(new ConfigDto.Response(3L, "현대카드", true, false));

        Map<String, Object> body = Map.of("code", "현대카드", "isActive", true);

        mockMvc.perform(post("/api/complex/settings/card-companies")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("카드사 추가 완료"))
                .andExpect(jsonPath("$.data.code").value("현대카드"));
    }

    @Test
    @DisplayName("카드사_수정")
    void 수정() throws Exception {
        given(cardCompanyConfigService.update(eq(1L), any()))
                .willReturn(new ConfigDto.Response(1L, "BC카드", false, false));

        Map<String, Object> body = Map.of("isActive", false);

        mockMvc.perform(put("/api/complex/settings/card-companies/{seq}", 1L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("카드사 수정 완료"))
                .andExpect(jsonPath("$.data.isActive").value(false));
    }

    @Test
    @DisplayName("카드사_삭제")
    void 삭제() throws Exception {
        willDoNothing().given(cardCompanyConfigService).delete(eq(1L));

        mockMvc.perform(delete("/api/complex/settings/card-companies/{seq}", 1L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("카드사 삭제 완료"));
    }

    @Test
    @DisplayName("인증_없으면_401")
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/complex/settings/card-companies"))
                .andExpect(status().isUnauthorized());
    }
}
