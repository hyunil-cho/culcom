package com.culcom.controller.complex.dashboard;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.ComplexDashboardMapper;
import com.culcom.repository.ComplexMemberMembershipRepository;
import com.culcom.repository.ComplexPostponementReturnScanLogRepository;
import com.culcom.repository.MemberActivityLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.*;
import java.util.*;

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
@WebMvcTest(ComplexDashboardController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class ComplexDashboardControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean ComplexMemberMembershipRepository membershipRepository;
    @MockBean MemberActivityLogRepository memberActivityLogRepository;
    @MockBean ComplexDashboardMapper complexDashboardMapper;
    @MockBean ComplexPostponementReturnScanLogRepository returnScanLogRepository;

    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, 1L);

        // 기본: 모든 레포지토리/매퍼 호출에 빈 리스트 반환
        given(membershipRepository.findExpiringSoon(anyLong(), any(), any()))
                .willReturn(Collections.emptyList());
        given(membershipRepository.findRecentlyExpired(anyLong(), any(), any()))
                .willReturn(Collections.emptyList());
        given(membershipRepository.findLowRemaining(anyLong(), any(), anyInt()))
                .willReturn(Collections.emptyList());
        given(memberActivityLogRepository.findAutoExpiredBetween(anyLong(), any(), any()))
                .willReturn(Collections.emptyList());
        given(complexDashboardMapper.selectMembers(anyLong(), anyString(), anyInt()))
                .willReturn(Collections.emptyList());
        given(complexDashboardMapper.selectStaffs(anyLong(), anyString(), anyInt()))
                .willReturn(Collections.emptyList());
        given(complexDashboardMapper.selectPostponements(anyLong(), anyString(), anyInt()))
                .willReturn(Collections.emptyList());
        given(complexDashboardMapper.selectRefunds(anyLong(), anyString(), anyInt()))
                .willReturn(Collections.emptyList());
        given(complexDashboardMapper.selectTransfers(anyLong(), anyString(), anyInt()))
                .willReturn(Collections.emptyList());
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
            principal, null,
            List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    // ========== 멤버십 알림 ==========

    @Test
    void 멤버십_알림_조회_성공() throws Exception {
        mockMvc.perform(get("/api/complex/dashboard/membership-alerts")
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.windowDays").value(14))
                .andExpect(jsonPath("$.data.countThreshold").value(3))
                .andExpect(jsonPath("$.data.expiringSoon").isArray())
                .andExpect(jsonPath("$.data.recentlyExpired").isArray())
                .andExpect(jsonPath("$.data.lowRemaining").isArray())
                .andExpect(jsonPath("$.data.autoExpiredToday").isArray());
    }

    @Test
    void 멤버십_알림_커스텀_파라미터() throws Exception {
        mockMvc.perform(get("/api/complex/dashboard/membership-alerts")
                        .with(auth())
                        .param("windowDays", "30")
                        .param("countThreshold", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.windowDays").value(30))
                .andExpect(jsonPath("$.data.countThreshold").value(5));
    }

    // ========== 추이 ==========

    @Test
    void 추이_월별_조회() throws Exception {
        mockMvc.perform(get("/api/complex/dashboard/trends")
                        .with(auth())
                        .param("period", "month")
                        .param("count", "6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.period").value("month"))
                .andExpect(jsonPath("$.data.count").value(6))
                .andExpect(jsonPath("$.data.members").isArray())
                .andExpect(jsonPath("$.data.staffs").isArray())
                .andExpect(jsonPath("$.data.postponements").isArray())
                .andExpect(jsonPath("$.data.refunds").isArray())
                .andExpect(jsonPath("$.data.transfers").isArray());
    }

    @Test
    void 추이_일별_조회() throws Exception {
        mockMvc.perform(get("/api/complex/dashboard/trends")
                        .with(auth())
                        .param("period", "day")
                        .param("count", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.period").value("day"))
                .andExpect(jsonPath("$.data.count").value(7));
    }

    @Test
    void 추이_유효하지_않은_기간은_month로_기본설정() throws Exception {
        mockMvc.perform(get("/api/complex/dashboard/trends")
                        .with(auth())
                        .param("period", "invalid")
                        .param("count", "6"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.period").value("month"));
    }

    // ========== 인증 ==========

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/complex/dashboard/membership-alerts"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/complex/dashboard/trends"))
                .andExpect(status().isUnauthorized());
    }
}
