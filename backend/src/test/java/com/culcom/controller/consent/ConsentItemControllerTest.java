package com.culcom.controller.consent;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.consent.ConsentItemResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.ConsentItemService;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ConsentItemControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean ConsentItemService consentItemService;

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

    private ConsentItemResponse sampleItem() {
        return ConsentItemResponse.builder()
                .seq(1L).title("개인정보 수집").content("개인정보를 수집합니다")
                .required(true).category("개인정보").version(1)
                .createdDate(LocalDateTime.now()).build();
    }

    @Nested
    class ListItems {

        @Test
        void 동의항목_전체_목록_조회() throws Exception {
            given(consentItemService.list()).willReturn(List.of(sampleItem()));

            mockMvc.perform(get("/api/consent-items").with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(1)));
        }

        @Test
        void 동의항목_카테고리별_목록_조회() throws Exception {
            given(consentItemService.listByCategory("개인정보")).willReturn(List.of(sampleItem()));

            mockMvc.perform(get("/api/consent-items").param("category", "개인정보").with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(1)));
        }
    }

    @Nested
    class GetItem {

        @Test
        void 동의항목_단건_조회_성공() throws Exception {
            given(consentItemService.get(1L)).willReturn(sampleItem());

            mockMvc.perform(get("/api/consent-items/{seq}", 1L).with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.title").value("개인정보 수집"));
        }
    }

    @Nested
    class Create {

        @Test
        void 동의항목_생성_성공() throws Exception {
            given(consentItemService.create(any())).willReturn(sampleItem());

            mockMvc.perform(post("/api/consent-items")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "title", "개인정보 수집", "content", "내용",
                                    "required", true, "category", "개인정보"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("동의항목 추가 완료"));
        }

        @Test
        void 동의항목_생성시_title_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/consent-items")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "title", "", "content", "내용",
                                    "required", true, "category", "개인정보"))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void 동의항목_생성시_content_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/consent-items")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "title", "제목", "content", "",
                                    "required", true, "category", "개인정보"))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void 동의항목_생성시_category_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/consent-items")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "title", "제목", "content", "내용",
                                    "required", true, "category", ""))))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    class Update {

        @Test
        void 동의항목_수정_성공() throws Exception {
            given(consentItemService.update(anyLong(), any())).willReturn(sampleItem());

            mockMvc.perform(put("/api/consent-items/{seq}", 1L)
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "title", "수정", "content", "수정내용",
                                    "required", false, "category", "기타"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("동의항목 수정 완료"));
        }
    }

    @Nested
    class Delete {

        @Test
        void 동의항목_삭제_성공() throws Exception {
            willDoNothing().given(consentItemService).delete(1L);

            mockMvc.perform(delete("/api/consent-items/{seq}", 1L).with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("동의항목 삭제 완료"));
        }
    }

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/consent-items"))
                .andExpect(status().isUnauthorized());
    }
}
