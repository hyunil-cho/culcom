package com.culcom.controller.publicapi;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.dto.consent.ConsentItemResponse;
import com.culcom.service.ConsentItemService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PublicConsentController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class PublicConsentControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean ConsentItemService consentItemService;

    private ConsentItemResponse item(long seq, String title, String category) {
        return ConsentItemResponse.builder()
                .seq(seq)
                .title(title)
                .content("내용")
                .required(true)
                .category(category)
                .version(1)
                .build();
    }

    @Test
    @DisplayName("전체_약관_조회_카테고리_파라미터_없을때")
    void 전체_조회() throws Exception {
        given(consentItemService.list()).willReturn(List.of(
                item(1L, "이용약관", "SIGNUP"),
                item(2L, "개인정보", "SIGNUP")));

        mockMvc.perform(get("/api/public/consent-items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(2)));

        verify(consentItemService).list();
        verify(consentItemService, never()).listByCategory(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    @DisplayName("카테고리_필터_조회")
    void 카테고리_조회() throws Exception {
        given(consentItemService.listByCategory("SIGNUP"))
                .willReturn(List.of(item(1L, "이용약관", "SIGNUP")));

        mockMvc.perform(get("/api/public/consent-items").param("category", "SIGNUP"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].category").value("SIGNUP"));

        verify(consentItemService).listByCategory("SIGNUP");
        verify(consentItemService, never()).list();
    }

    @Test
    @DisplayName("카테고리_공백_문자열이면_전체_조회")
    void 카테고리_공백() throws Exception {
        given(consentItemService.list()).willReturn(List.of());

        mockMvc.perform(get("/api/public/consent-items").param("category", "   "))
                .andExpect(status().isOk());

        verify(consentItemService).list();
        verify(consentItemService, never()).listByCategory(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    @DisplayName("인증_없이_접근_가능")
    void 인증없이_가능() throws Exception {
        given(consentItemService.list()).willReturn(List.of());
        mockMvc.perform(get("/api/public/consent-items"))
                .andExpect(status().isOk());
    }
}
