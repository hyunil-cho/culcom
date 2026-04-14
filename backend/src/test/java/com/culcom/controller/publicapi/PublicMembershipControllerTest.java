package com.culcom.controller.publicapi;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.controller.publicapi.PublicMembershipController.MembershipCheckResponse;
import com.culcom.controller.publicapi.PublicMembershipController.MembershipCheckResponse.MemberSummary;
import com.culcom.controller.publicapi.PublicMembershipController.MembershipCheckResponse.MembershipDetail;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.PublicMembershipService;
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
class PublicMembershipControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean PublicMembershipService publicMembershipService;

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
    @DisplayName("멤버십_조회_성공")
    void 멤버십_조회_성공() throws Exception {
        MembershipDetail detail = new MembershipDetail(
            "3개월 회원권", "이용중", "2026-01-01", "2026-04-01",
            90, 30, 3, 1, 28, 2, 30, 93);
        MemberSummary summary = new MemberSummary(
            "홍길동", "01012345678", "본점", "초급", List.of(detail));
        MembershipCheckResponse response = new MembershipCheckResponse(summary);

        given(publicMembershipService.check("홍길동", "01012345678")).willReturn(response);

        mockMvc.perform(get("/api/public/membership/check")
                .param("name", "홍길동")
                .param("phone", "01012345678"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.member.name").value("홍길동"))
            .andExpect(jsonPath("$.data.member.memberships", hasSize(1)))
            .andExpect(jsonPath("$.data.member.memberships[0].membershipName").value("3개월 회원권"));
    }

    @Test
    @DisplayName("인증_없이도_접근_가능")
    void 인증_없이도_접근_가능() throws Exception {
        MemberSummary summary = new MemberSummary("홍길동", "01012345678", "본점", "초급", List.of());
        MembershipCheckResponse response = new MembershipCheckResponse(summary);
        given(publicMembershipService.check("홍길동", "01012345678")).willReturn(response);

        mockMvc.perform(get("/api/public/membership/check")
                .param("name", "홍길동")
                .param("phone", "01012345678"))
            .andExpect(status().isOk());
    }
}
