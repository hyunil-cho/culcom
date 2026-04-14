package com.culcom.controller.complex.attendance;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.attendance.AttendanceResponse;
import com.culcom.dto.complex.attendance.BulkAttendanceResultResponse;
import com.culcom.entity.enums.AttendanceStatus;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.AttendanceService;
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
class AttendanceControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean AttendanceService attendanceService;

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
    @DisplayName("출석_목록_조회")
    void 출석_목록_조회() throws Exception {
        AttendanceResponse resp = AttendanceResponse.builder()
            .seq(1L)
            .memberSeq(10L)
            .memberMembershipSeq(100L)
            .classSeq(1L)
            .attendanceDate(LocalDate.of(2026, 1, 1))
            .status(AttendanceStatus.출석)
            .note("정상 출석")
            .createdDate(LocalDateTime.of(2026, 1, 1, 9, 0))
            .build();
        given(attendanceService.listByClassAndDate(eq(1L), eq(LocalDate.of(2026, 1, 1))))
            .willReturn(List.of(resp));

        mockMvc.perform(get("/api/complex/attendance")
                .param("classSeq", "1")
                .param("date", "2026-01-01")
                .with(auth()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data", hasSize(1)))
            .andExpect(jsonPath("$.data[0].seq").value(1))
            .andExpect(jsonPath("$.data[0].status").value("출석"));
    }

    @Test
    @DisplayName("출석_기록_성공")
    void 출석_기록_성공() throws Exception {
        AttendanceResponse resp = AttendanceResponse.builder()
            .seq(1L)
            .memberSeq(10L)
            .memberMembershipSeq(100L)
            .classSeq(1L)
            .attendanceDate(LocalDate.of(2026, 1, 1))
            .status(AttendanceStatus.출석)
            .build();
        given(attendanceService.record(any())).willReturn(resp);

        Map<String, Object> body = new HashMap<>();
        body.put("memberMembershipSeq", 100);
        body.put("classSeq", 1);
        body.put("attendanceDate", "2026-01-01");
        body.put("status", "출석");
        body.put("note", "");

        mockMvc.perform(post("/api/complex/attendance")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(auth()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("출석 기록 완료"))
            .andExpect(jsonPath("$.data.seq").value(1));
    }

    @Test
    @DisplayName("출석_수정_성공")
    void 출석_수정_성공() throws Exception {
        AttendanceResponse resp = AttendanceResponse.builder()
            .seq(1L)
            .memberSeq(10L)
            .memberMembershipSeq(100L)
            .classSeq(1L)
            .attendanceDate(LocalDate.of(2026, 1, 1))
            .status(AttendanceStatus.결석)
            .note("수정됨")
            .build();
        given(attendanceService.update(eq(1L), any())).willReturn(resp);

        Map<String, Object> body = new HashMap<>();
        body.put("memberMembershipSeq", 100);
        body.put("classSeq", 1);
        body.put("attendanceDate", "2026-01-01");
        body.put("status", "결석");
        body.put("note", "수정됨");

        mockMvc.perform(put("/api/complex/attendance/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(auth()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("출석 수정 완료"))
            .andExpect(jsonPath("$.data.status").value("결석"));
    }

    @Test
    @DisplayName("일괄출석_처리")
    void 일괄출석_처리() throws Exception {
        BulkAttendanceResultResponse result = BulkAttendanceResultResponse.builder()
            .memberSeq(10L)
            .name("홍길동")
            .status("출석")
            .build();
        given(attendanceService.processBulkAttendance(any())).willReturn(List.of(result));

        Map<String, Object> body = new HashMap<>();
        body.put("classSeq", 1);
        body.put("members", List.of(
            Map.of("memberSeq", 10, "staff", false, "attended", true)
        ));

        mockMvc.perform(post("/api/complex/attendance/bulk")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(auth()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data", hasSize(1)))
            .andExpect(jsonPath("$.data[0].name").value("홍길동"));
    }

    @Test
    @DisplayName("수업_순서_변경")
    void 수업_순서_변경() throws Exception {
        willDoNothing().given(attendanceService).reorderClasses(any());

        Map<String, Object> body = new HashMap<>();
        body.put("classOrders", List.of(
            Map.of("id", 1, "sortOrder", 0),
            Map.of("id", 2, "sortOrder", 1)
        ));

        mockMvc.perform(post("/api/complex/attendance/reorder")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(auth()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("회원_순서_변경")
    void 회원_순서_변경() throws Exception {
        willDoNothing().given(attendanceService).reorderMembers(any());

        Map<String, Object> body = new HashMap<>();
        body.put("classSeq", 1);
        body.put("memberOrders", List.of(
            Map.of("memberSeq", 10, "sortOrder", 0),
            Map.of("memberSeq", 20, "sortOrder", 1)
        ));

        mockMvc.perform(post("/api/complex/attendance/reorder/members")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))
                .with(auth()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("인증_없으면_401")
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/complex/attendance")
                .param("classSeq", "1")
                .param("date", "2026-01-01"))
            .andExpect(status().isUnauthorized());
    }
}
