package com.culcom.controller.auth;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.auth.UserResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class UserControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean UserService userService;

    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new CustomUserPrincipal(1L, "root", "루트", UserRole.ROOT, 1L);
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    private UserResponse sampleUser() {
        return UserResponse.builder()
                .seq(10L).userId("user1").name("사용자1").role("STAFF")
                .phone("01012345678").createdDate(LocalDateTime.now()).build();
    }

    // ========== 목록 조회 ==========

    @Nested
    class ListUsers {

        @Test
        void 사용자_목록_조회_성공() throws Exception {
            given(userService.list(anyLong(), any())).willReturn(List.of(sampleUser()));

            mockMvc.perform(get("/api/users").with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].userId").value("user1"));
        }

        @Test
        void 권한없는_사용자는_403() throws Exception {
            given(userService.list(anyLong(), any())).willReturn(null);

            mockMvc.perform(get("/api/users").with(auth()))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        void 인증_없으면_401() throws Exception {
            mockMvc.perform(get("/api/users"))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ========== 생성 ==========

    @Nested
    class Create {

        @Test
        void 사용자_생성_성공() throws Exception {
            given(userService.create(any(), anyLong(), any())).willReturn(sampleUser());

            mockMvc.perform(post("/api/users")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "userId", "newuser", "password", "pass123",
                                    "name", "새사용자", "phone", "01099998888"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("사용자 생성 완료"));
        }

        @Test
        void 필수값_누락시_400() throws Exception {
            mockMvc.perform(post("/api/users")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "userId", "", "password", "pass",
                                    "name", "이름", "phone", "010"))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void 중복_아이디면_400() throws Exception {
            given(userService.create(any(), anyLong(), any()))
                    .willThrow(new IllegalArgumentException("이미 존재하는 아이디입니다."));

            mockMvc.perform(post("/api/users")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "userId", "dup", "password", "pass",
                                    "name", "중복", "phone", "010"))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        void 권한없으면_403() throws Exception {
            given(userService.create(any(), anyLong(), any()))
                    .willThrow(new SecurityException("권한이 없습니다."));

            mockMvc.perform(post("/api/users")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "userId", "u", "password", "p",
                                    "name", "n", "phone", "010"))))
                    .andExpect(status().isForbidden());
        }
    }

    // ========== 수정 ==========

    @Nested
    class Update {

        @Test
        void 사용자_수정_성공() throws Exception {
            given(userService.update(anyLong(), any(), anyLong())).willReturn(sampleUser());

            mockMvc.perform(put("/api/users/{seq}", 10L)
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "userId", "u", "password", "p",
                                    "name", "수정", "phone", "010"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("사용자 수정 완료"));
        }

        @Test
        void 권한없으면_403() throws Exception {
            given(userService.update(anyLong(), any(), anyLong()))
                    .willThrow(new SecurityException("권한이 없습니다."));

            mockMvc.perform(put("/api/users/{seq}", 10L)
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "userId", "u", "password", "p",
                                    "name", "n", "phone", "010"))))
                    .andExpect(status().isForbidden());
        }
    }

    // ========== 삭제 ==========

    @Nested
    class Delete {

        @Test
        void 사용자_삭제_성공() throws Exception {
            willDoNothing().given(userService).delete(anyLong(), anyLong());

            mockMvc.perform(delete("/api/users/{seq}", 10L).with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("사용자 삭제 완료"));
        }

        @Test
        void 자기자신_삭제시_400() throws Exception {
            willThrow(new IllegalArgumentException("자기 자신은 삭제할 수 없습니다."))
                    .given(userService).delete(anyLong(), anyLong());

            mockMvc.perform(delete("/api/users/{seq}", 1L).with(auth()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        void 권한없으면_403() throws Exception {
            willThrow(new SecurityException("권한이 없습니다."))
                    .given(userService).delete(anyLong(), anyLong());

            mockMvc.perform(delete("/api/users/{seq}", 10L).with(auth()))
                    .andExpect(status().isForbidden());
        }
    }
}
