package com.culcom.controller.complex.postponements;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.postponement.PostponementResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.PostponementQueryMapper;
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

@WebMvcTest(PostponementQueryController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class PostponementQueryControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean PostponementQueryMapper postponementQueryMapper;

    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, 3L);
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    @Test
    @DisplayName("목록_기본")
    void 목록_기본() throws Exception {
        given(postponementQueryMapper.search(anyLong(), any(), any(), anyInt(), anyInt()))
                .willReturn(List.of(PostponementResponse.builder().seq(1L).memberName("홍길동").build()));
        given(postponementQueryMapper.count(anyLong(), any(), any())).willReturn(1);

        mockMvc.perform(get("/api/complex/postponements").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].memberName").value("홍길동"));

        verify(postponementQueryMapper).search(eq(3L), isNull(), isNull(), eq(0), eq(20));
    }

    @Test
    @DisplayName("목록_상태_키워드_필터")
    void 목록_상태() throws Exception {
        given(postponementQueryMapper.search(anyLong(), any(), any(), anyInt(), anyInt())).willReturn(List.of());
        given(postponementQueryMapper.count(anyLong(), any(), any())).willReturn(0);

        mockMvc.perform(get("/api/complex/postponements")
                        .with(auth())
                        .param("status", "승인")
                        .param("keyword", "홍")
                        .param("size", "50"))
                .andExpect(status().isOk());

        verify(postponementQueryMapper).search(eq(3L), eq("승인"), eq("홍"), eq(0), eq(50));
    }

    @Test
    @DisplayName("회원_이력_조회")
    void 회원이력() throws Exception {
        given(postponementQueryMapper.findByMemberSeq(99L))
                .willReturn(List.of(PostponementResponse.builder().seq(1L).memberName("홍길동").build()));

        mockMvc.perform(get("/api/complex/postponements/member/{memberSeq}", 99L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].memberName").value("홍길동"));
    }

    @Test
    @DisplayName("인증없으면_401")
    void 인증없음() throws Exception {
        mockMvc.perform(get("/api/complex/postponements")).andExpect(status().isUnauthorized());
    }
}
