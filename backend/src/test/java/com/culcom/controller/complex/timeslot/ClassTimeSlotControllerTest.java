package com.culcom.controller.complex.timeslot;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.classes.ClassTimeSlotRequest;
import com.culcom.dto.complex.classes.ClassTimeSlotResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.ClassTimeSlotService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentMatchers;
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
@WebMvcTest(ClassTimeSlotController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class ClassTimeSlotControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean ClassTimeSlotService classTimeSlotService;

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

    private ClassTimeSlotResponse sampleTimeSlotResponse() {
        return ClassTimeSlotResponse.builder()
                .seq(1L)
                .name("오전반")
                .daysOfWeek("월,수,금")
                .startTime("10:00")
                .endTime("11:00")
                .build();
    }

    // ========== 1. 시간대 목록 조회 ==========

    @Test
    void 시간대_목록_조회() throws Exception {
        given(classTimeSlotService.list(1L)).willReturn(List.of(sampleTimeSlotResponse()));

        mockMvc.perform(get("/api/complex/timeslots").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("오전반"))
                .andExpect(jsonPath("$.data[0].daysOfWeek").value("월,수,금"));
    }

    // ========== 2. 시간대 생성 성공 ==========

    @Test
    void 시간대_생성_성공() throws Exception {
        given(classTimeSlotService.create(ArgumentMatchers.any(ClassTimeSlotRequest.class), eq(1L)))
                .willReturn(sampleTimeSlotResponse());

        Map<String, Object> body = Map.of(
                "name", "오전반",
                "daysOfWeek", "월,수,금",
                "startTime", "10:00",
                "endTime", "11:00");

        mockMvc.perform(post("/api/complex/timeslots")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("시간대 추가 완료"))
                .andExpect(jsonPath("$.data.name").value("오전반"));
    }

    // ========== 3. 시간대 생성시 name 빈값이면 400 ==========

    @Test
    void 시간대_생성시_name_빈값이면_400() throws Exception {
        Map<String, Object> body = Map.of(
                "name", "",
                "daysOfWeek", "월,수,금",
                "startTime", "10:00",
                "endTime", "11:00");

        mockMvc.perform(post("/api/complex/timeslots")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ========== 4. 시간대 생성시 daysOfWeek 빈값이면 400 ==========

    @Test
    void 시간대_생성시_daysOfWeek_빈값이면_400() throws Exception {
        Map<String, Object> body = Map.of(
                "name", "오전반",
                "daysOfWeek", "",
                "startTime", "10:00",
                "endTime", "11:00");

        mockMvc.perform(post("/api/complex/timeslots")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ========== 5. 시간대 수정 성공 ==========

    @Test
    void 시간대_수정_성공() throws Exception {
        ClassTimeSlotResponse updated = ClassTimeSlotResponse.builder()
                .seq(1L).name("오후반").daysOfWeek("화,목")
                .startTime("14:00").endTime("15:00")
                .build();
        given(classTimeSlotService.update(eq(1L), ArgumentMatchers.any(ClassTimeSlotRequest.class))).willReturn(updated);

        Map<String, Object> body = Map.of(
                "name", "오후반",
                "daysOfWeek", "화,목",
                "startTime", "14:00",
                "endTime", "15:00");

        mockMvc.perform(put("/api/complex/timeslots/{seq}", 1L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("시간대 수정 완료"))
                .andExpect(jsonPath("$.data.name").value("오후반"));
    }

    // ========== 6. 시간대 삭제 성공 ==========

    @Test
    void 시간대_삭제_성공() throws Exception {
        willDoNothing().given(classTimeSlotService).delete(1L);

        mockMvc.perform(delete("/api/complex/timeslots/{seq}", 1L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("시간대 삭제 완료"));
    }

    // ========== 7. 인증 없으면 401 ==========

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/complex/timeslots"))
                .andExpect(status().isUnauthorized());
    }
}
