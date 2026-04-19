package com.culcom.controller.complex.attendance;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.attendance.BulkAttendanceResultResponse;
import com.culcom.entity.enums.BulkAttendanceResultStatus;
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
    @DisplayName("일괄출석_처리")
    void 일괄출석_처리() throws Exception {
        BulkAttendanceResultResponse result = BulkAttendanceResultResponse.builder()
            .memberSeq(10L)
            .name("홍길동")
            .status(BulkAttendanceResultStatus.출석)
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
        willDoNothing().given(attendanceService).reorderMembers(any(), any());

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
}
