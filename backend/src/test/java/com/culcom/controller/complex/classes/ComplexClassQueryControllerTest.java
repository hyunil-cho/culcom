package com.culcom.controller.complex.classes;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.classes.ComplexClassResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.ComplexClassQueryMapper;
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

import static org.hamcrest.Matchers.hasSize;
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

@WebMvcTest(ComplexClassQueryController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class ComplexClassQueryControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean ComplexClassQueryMapper complexClassQueryMapper;

    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, 7L);
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    private ComplexClassResponse sample(long seq, String name) {
        return ComplexClassResponse.builder()
                .seq(seq).name(name).capacity(10).sortOrder(0)
                .timeSlotSeq(1L).timeSlotName("오전반")
                .build();
    }

    @Test
    @DisplayName("수업_목록_기본_페이징_branchSeq_전달")
    void 목록_기본() throws Exception {
        given(complexClassQueryMapper.search(anyLong(), any(), anyInt(), anyInt()))
                .willReturn(List.of(sample(1L, "수업1"), sample(2L, "수업2")));
        given(complexClassQueryMapper.count(anyLong(), any())).willReturn(2);

        mockMvc.perform(get("/api/complex/classes").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(2)))
                .andExpect(jsonPath("$.data.totalElements").value(2));

        verify(complexClassQueryMapper).search(eq(7L), isNull(), eq(0), eq(20));
    }

    @Test
    @DisplayName("수업_목록_키워드_검색_페이지_지정")
    void 목록_검색() throws Exception {
        given(complexClassQueryMapper.search(anyLong(), any(), anyInt(), anyInt()))
                .willReturn(List.of());
        given(complexClassQueryMapper.count(anyLong(), any())).willReturn(0);

        mockMvc.perform(get("/api/complex/classes")
                        .with(auth())
                        .param("page", "3")
                        .param("size", "5")
                        .param("keyword", "태권"))
                .andExpect(status().isOk());

        verify(complexClassQueryMapper).search(eq(7L), eq("태권"), eq(15), eq(5));
    }

    @Test
    @DisplayName("인증없으면_401")
    void 인증없음() throws Exception {
        mockMvc.perform(get("/api/complex/classes")).andExpect(status().isUnauthorized());
    }
}
