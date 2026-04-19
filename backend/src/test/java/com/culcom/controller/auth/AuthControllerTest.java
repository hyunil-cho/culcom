package com.culcom.controller.auth;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.auth.SessionInfo;
import com.culcom.entity.branch.Branch;
import com.culcom.entity.enums.UserRole;
import com.culcom.exception.ForbiddenException;
import com.culcom.repository.BranchRepository;
import com.culcom.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
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
class AuthControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired BranchRepository branchRepository;

    @MockBean AuthService authService;

    private Branch branch;
    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        branch = branchRepository.save(Branch.builder()
                .branchName("테스트지점").alias("auth-test-" + System.nanoTime())
                .address("서울시").branchManager("김매니저").build());

        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, branch.getSeq());
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    private RequestPostProcessor authWith(CustomUserPrincipal p) {
        var token = new UsernamePasswordAuthenticationToken(
                p, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + p.getRole().name())));
        return authentication(token);
    }

    private SessionInfo sessionInfo(String userId, String name, UserRole role, Long branchSeq, String branchName) {
        return SessionInfo.builder()
                .userSeq(1L).userId(userId).name(name).role(role.name())
                .selectedBranchSeq(branchSeq).selectedBranchName(branchName)
                .requirePasswordChange(false).build();
    }

    // ========== 로그인 ==========

    @Nested
    class Login {

        @Test
        void 로그인_성공() throws Exception {
            SessionInfo info = sessionInfo("admin", "관리자", UserRole.ROOT,
                    branch.getSeq(), branch.getBranchName());
            given(authService.login(any(), any(), any())).willReturn(info);

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("userId", "admin", "password", "pass"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.userId").value("admin"))
                    .andExpect(jsonPath("$.data.name").value("관리자"));
        }

        @Test
        void 아이디_비밀번호_불일치시_401() throws Exception {
            given(authService.login(any(), any(), any()))
                    .willThrow(new AccessDeniedException("아이디 또는 비밀번호가 올바르지 않습니다."));

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("userId", "wrong", "password", "wrong"))))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        void userId가_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("userId", "", "password", "pass"))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void password가_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("userId", "admin", "password", ""))))
                    .andExpect(status().isBadRequest());
        }
    }

    // ========== 세션 조회 ==========

    @Nested
    class Me {

        @Test
        void 세션정보_조회_성공() throws Exception {
            given(authService.getCurrentSession(any())).willReturn(
                    sessionInfo("testuser", "테스트", UserRole.ROOT,
                            branch.getSeq(), branch.getBranchName()));

            mockMvc.perform(get("/api/auth/me").with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.userId").value("testuser"))
                    .andExpect(jsonPath("$.data.selectedBranchSeq").value(branch.getSeq()));
        }

        @Test
        void 인증_없으면_401() throws Exception {
            mockMvc.perform(get("/api/auth/me"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ========== 지점 선택 ==========

    @Nested
    class SelectBranch {

        @Test
        void 지점_변경_성공() throws Exception {
            willDoNothing().given(authService).selectBranch(eq(branch.getSeq()), any(), any(), any());

            mockMvc.perform(post("/api/auth/branch/{branchSeq}", branch.getSeq())
                            .with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("지점 변경 완료"));
        }

        @Test
        void 존재하지_않는_지점이면_400() throws Exception {
            willThrow(new IllegalArgumentException("존재하지 않는 지점입니다."))
                    .given(authService).selectBranch(eq(99999L), any(), any(), any());

            mockMvc.perform(post("/api/auth/branch/{branchSeq}", 99999L)
                            .with(auth()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        void ROOT가_아닌_사용자가_권한없는_지점_선택시_403() throws Exception {
            CustomUserPrincipal staffPrincipal = new CustomUserPrincipal(
                    2L, "staff", "스태프", UserRole.STAFF, branch.getSeq());
            willThrow(new ForbiddenException("접근 권한이 없는 지점입니다."))
                    .given(authService).selectBranch(eq(branch.getSeq()), any(), any(), any());

            mockMvc.perform(post("/api/auth/branch/{branchSeq}", branch.getSeq())
                            .with(authWith(staffPrincipal)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        void 인증_없으면_401() throws Exception {
            mockMvc.perform(post("/api/auth/branch/{branchSeq}", branch.getSeq()))
                    .andExpect(status().isUnauthorized());
        }
    }
}
