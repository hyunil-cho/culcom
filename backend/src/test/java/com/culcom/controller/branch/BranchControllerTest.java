package com.culcom.controller.branch;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.branch.BranchDetailResponse;
import com.culcom.dto.branch.BranchListResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.AuthService;
import com.culcom.service.BranchService;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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
@WebMvcTest(BranchController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class BranchControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean BranchService branchService;
    @MockBean AuthService authService;

    private CustomUserPrincipal managerPrincipal;
    private CustomUserPrincipal rootPrincipal;

    @BeforeEach
    void setUp() {
        managerPrincipal = new CustomUserPrincipal(1L, "manager", "매니저", UserRole.BRANCH_MANAGER, 1L);
        rootPrincipal = new CustomUserPrincipal(2L, "root", "루트", UserRole.ROOT, 1L);
    }

    private RequestPostProcessor authManager() {
        var token = new UsernamePasswordAuthenticationToken(
                managerPrincipal, null,
                List.of(new SimpleGrantedAuthority("ROLE_BRANCH_MANAGER")));
        return authentication(token);
    }

    private RequestPostProcessor authRoot() {
        var token = new UsernamePasswordAuthenticationToken(
                rootPrincipal, null,
                List.of(new SimpleGrantedAuthority("ROLE_ROOT")));
        return authentication(token);
    }

    private BranchDetailResponse sampleDetail() {
        return BranchDetailResponse.builder()
                .seq(1L).branchName("테스트지점").alias("test")
                .branchManager("김매니저").address("서울시").directions("3번출구")
                .createdDate(LocalDateTime.now()).build();
    }

    // ========== 목록 조회 ==========

    @Nested
    class ListBranches {

        @Test
        void 지점_목록_조회_성공() throws Exception {
            given(branchService.list(anyLong())).willReturn(List.of(
                    BranchListResponse.builder().seq(1L).branchName("지점1").build()));

            mockMvc.perform(get("/api/branches").with(authManager()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)));
        }

        @Test
        void 인증_없으면_401() throws Exception {
            mockMvc.perform(get("/api/branches"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ========== 상세 조회 ==========

    @Nested
    class Get {

        @Test
        void 지점_상세_조회_성공() throws Exception {
            given(branchService.get(1L)).willReturn(sampleDetail());

            mockMvc.perform(get("/api/branches/{seq}", 1L).with(authManager()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.branchName").value("테스트지점"));
        }
    }

    // ========== 생성 ==========

    @Nested
    class Create {

        @Test
        void 지점_생성_성공_BRANCH_MANAGER() throws Exception {
            given(branchService.create(any(), anyLong())).willReturn(sampleDetail());

            mockMvc.perform(post("/api/branches")
                            .with(authManager())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("branchName", "새지점"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("지점 추가 완료"));
        }

        @Test
        void 지점_생성시_branchName_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/branches")
                            .with(authManager())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("branchName", ""))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void 지점_생성시_BRANCH_MANAGER가_아니면_403() throws Exception {
            mockMvc.perform(post("/api/branches")
                            .with(authRoot())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("branchName", "새지점"))))
                    .andExpect(status().isForbidden());
        }
    }

    // ========== 수정 ==========

    @Nested
    class Update {

        @Test
        void 지점_수정_성공() throws Exception {
            given(branchService.update(anyLong(), any())).willReturn(sampleDetail());

            mockMvc.perform(put("/api/branches/{seq}", 1L)
                            .with(authManager())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("branchName", "수정지점"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("지점 수정 완료"));
        }

        @Test
        void 지점_수정시_BRANCH_MANAGER가_아니면_403() throws Exception {
            mockMvc.perform(put("/api/branches/{seq}", 1L)
                            .with(authRoot())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("branchName", "수정"))))
                    .andExpect(status().isForbidden());
        }
    }

    // ========== 삭제 ==========

    @Nested
    class Delete {

        @Test
        void 지점_삭제_성공() throws Exception {
            willDoNothing().given(branchService).delete(1L);

            mockMvc.perform(delete("/api/branches/{seq}", 1L).with(authManager()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("지점 삭제 완료"));
        }

        @Test
        void 지점_삭제시_BRANCH_MANAGER가_아니면_403() throws Exception {
            mockMvc.perform(delete("/api/branches/{seq}", 1L).with(authRoot()))
                    .andExpect(status().isForbidden());
        }
    }
}