package com.culcom.controller.complex.classes;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.ComplexClassService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;

import static org.mockito.BDDMockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;

/**
 * POST /api/complex/classes/{seq}/members/{memberSeq}
 * 의 HTTP 레벨 응답을 검증한다. 서비스 레이어의 정원 초과 검증은
 * ComplexClassServiceCapacityTest 가 담당하고, 이 테스트는 컨트롤러가
 * 그 예외를 400 Bad Request + 메시지로 내려주는지 확인한다.
 */
@WebMvcTest(ComplexClassController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class ComplexClassControllerCapacityTest {

    @Autowired MockMvc mockMvc;

    @MockBean ComplexClassService complexClassService;

    private RequestPostProcessor auth() {
        var principal = new CustomUserPrincipal(1L, "admin", "관리자", UserRole.ROOT, 1L);
        var token = new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_ROOT")));
        return authentication(token);
    }

    @Test
    @DisplayName("addMember 서비스가 정원 초과로 예외를 던지면 400 + 실패 메시지")
    void 정원_초과_400() throws Exception {
        willThrow(new IllegalStateException("정원이 초과되었습니다. (현재 3/3)"))
                .given(complexClassService).addMember(1L, 10L);

        mockMvc.perform(post("/api/complex/classes/{seq}/members/{memberSeq}", 1L, 10L)
                        .with(auth()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("정원이 초과")));
    }

    @Test
    @DisplayName("addMember 정상 처리 시 200 + 성공 메시지")
    void 정상_추가_200() throws Exception {
        willDoNothing().given(complexClassService).addMember(1L, 10L);

        mockMvc.perform(post("/api/complex/classes/{seq}/members/{memberSeq}", 1L, 10L)
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("팀에 멤버 추가 완료"));
    }

    @Test
    @DisplayName("addMember 에서 이미 팀에 있는 회원이면 400 + 중복 메시지")
    void 중복_회원_400() throws Exception {
        willThrow(new IllegalStateException("이미 팀에 포함된 회원입니다."))
                .given(complexClassService).addMember(1L, 10L);

        mockMvc.perform(post("/api/complex/classes/{seq}/members/{memberSeq}", 1L, 10L)
                        .with(auth()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("이미 팀에 포함")));
    }

    @Test
    @DisplayName("addMember 인증 없이 호출하면 401")
    void 비인증_401() throws Exception {
        mockMvc.perform(post("/api/complex/classes/{seq}/members/{memberSeq}", 1L, 10L))
                .andExpect(status().isUnauthorized());
    }
}
