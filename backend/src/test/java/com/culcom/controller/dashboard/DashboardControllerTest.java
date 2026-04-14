package com.culcom.controller.dashboard;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.DashboardMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DashboardControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean DashboardMapper dashboardMapper;

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

    @Nested
    class GetDashboard {

        @Test
        void 대시보드_조회_성공() throws Exception {
            given(dashboardMapper.countTodayCustomers(anyLong())).willReturn(5);
            given(dashboardMapper.selectDailyStats(anyLong(), anyInt())).willReturn(List.of());
            given(dashboardMapper.selectSmsRemaining(anyLong())).willReturn(100);
            given(dashboardMapper.selectLmsRemaining(anyLong())).willReturn(50);

            mockMvc.perform(get("/api/dashboard").with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.todayTotalCustomers").value(5))
                    .andExpect(jsonPath("$.data.smsRemaining").value(100))
                    .andExpect(jsonPath("$.data.lmsRemaining").value(50));
        }

        @Test
        void 인증_없으면_401() throws Exception {
            mockMvc.perform(get("/api/dashboard"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    class CallerStats {

        @Test
        void 상담원_통계_일별_조회() throws Exception {
            given(dashboardMapper.selectCallerStats(anyLong(), eq("day"))).willReturn(List.of());

            mockMvc.perform(get("/api/dashboard/caller-stats")
                            .param("period", "day")
                            .with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        void 상담원_통계_주별_조회() throws Exception {
            given(dashboardMapper.selectCallerStats(anyLong(), eq("week"))).willReturn(List.of());

            mockMvc.perform(get("/api/dashboard/caller-stats")
                            .param("period", "week")
                            .with(auth()))
                    .andExpect(status().isOk());
        }

        @Test
        void 상담원_통계_월별_조회() throws Exception {
            given(dashboardMapper.selectCallerStats(anyLong(), eq("month"))).willReturn(List.of());

            mockMvc.perform(get("/api/dashboard/caller-stats")
                            .param("period", "month")
                            .with(auth()))
                    .andExpect(status().isOk());
        }

        @Test
        void 상담원_통계_유효하지_않은_기간이면_400() throws Exception {
            mockMvc.perform(get("/api/dashboard/caller-stats")
                            .param("period", "invalid")
                            .with(auth()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }
    }
}
