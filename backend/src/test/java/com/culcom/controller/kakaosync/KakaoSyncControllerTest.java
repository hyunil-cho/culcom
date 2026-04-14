package com.culcom.controller.kakaosync;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.kakaosync.KakaoSyncUrlResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.KakaoSyncService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
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

import java.time.*;
import java.util.*;

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
class KakaoSyncControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean KakaoSyncService kakaoSyncService;

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
    @DisplayName("카카오싱크_URL_조회_성공")
    void 카카오싱크_URL_조회_성공() throws Exception {
        KakaoSyncUrlResponse response = KakaoSyncUrlResponse.builder()
            .kakaoSyncUrl("https://kauth.kakao.com/oauth/authorize?client_id=test")
            .branchName("본점")
            .build();
        given(kakaoSyncService.getKakaoSyncUrl(1L)).willReturn(response);

        mockMvc.perform(get("/api/kakao-sync/url")
                .with(auth()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.kakaoSyncUrl").value("https://kauth.kakao.com/oauth/authorize?client_id=test"))
            .andExpect(jsonPath("$.data.branchName").value("본점"));
    }

    @Test
    @DisplayName("인증_없으면_401")
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/kakao-sync/url"))
            .andExpect(status().isUnauthorized());
    }
}
