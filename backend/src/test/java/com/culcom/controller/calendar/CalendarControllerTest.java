package com.culcom.controller.calendar;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.calendar.CalendarEventResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.CalendarService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
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
class CalendarControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean CalendarService calendarService;

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

    // ========== 예약 ==========

    @Nested
    class Reservations {

        @Test
        void 예약_목록_조회_성공() throws Exception {
            given(calendarService.getReservations(anyLong(), any(), any())).willReturn(List.of());

            mockMvc.perform(get("/api/calendar/reservations")
                            .param("startDate", "2026-01-01")
                            .param("endDate", "2026-01-31")
                            .with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        void 예약_상태_변경_성공() throws Exception {
            given(calendarService.updateReservationStatus(anyLong(), anyString())).willReturn(null);

            mockMvc.perform(put("/api/calendar/reservations/{seq}/status", 1L)
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("status", "확정"))))
                    .andExpect(status().isOk());
        }

        @Test
        void 예약_상태_변경시_status_빈값이면_400() throws Exception {
            mockMvc.perform(put("/api/calendar/reservations/{seq}/status", 1L)
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("status", ""))))
                    .andExpect(status().isBadRequest());
        }
    }

    // ========== 일정 ==========

    @Nested
    class Events {

        @Test
        void 일정_목록_조회_성공() throws Exception {
            given(calendarService.getEvents(anyLong(), any(), any())).willReturn(List.of());

            mockMvc.perform(get("/api/calendar/events")
                            .param("startDate", "2026-01-01")
                            .param("endDate", "2026-01-31")
                            .with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        void 일정_등록_성공() throws Exception {
            given(calendarService.createEvent(anyLong(), any()))
                    .willReturn(CalendarEventResponse.builder()
                            .seq(1L).title("회의").author("김작성자")
                            .eventDate("2026-02-01").startTime("10:00").endTime("11:00").build());

            mockMvc.perform(post("/api/calendar/events")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "title", "회의", "author", "김작성자",
                                    "eventDate", "2026-02-01",
                                    "startTime", "10:00", "endTime", "11:00"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("일정이 등록되었습니다."));
        }

        @Test
        void 일정_등록시_title_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/calendar/events")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "title", "", "author", "작성자",
                                    "eventDate", "2026-02-01",
                                    "startTime", "10:00", "endTime", "11:00"))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void 일정_등록시_author_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/calendar/events")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "title", "회의", "author", "",
                                    "eventDate", "2026-02-01",
                                    "startTime", "10:00", "endTime", "11:00"))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void 일정_삭제_성공() throws Exception {
            willDoNothing().given(calendarService).deleteEvent(anyLong(), anyLong());

            mockMvc.perform(delete("/api/calendar/events/{seq}", 1L).with(auth()))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/calendar/reservations")
                        .param("startDate", "2026-01-01")
                        .param("endDate", "2026-01-31"))
                .andExpect(status().isUnauthorized());
    }
}
