package com.culcom.controller.complex.postponements;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.ReasonDto;
import com.culcom.dto.complex.postponement.PostponementResponse;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.PostponementQueryMapper;
import com.culcom.service.PostponementService;
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
class PostponementControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean PostponementService postponementService;
    @MockBean PostponementQueryMapper postponementQueryMapper;

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

    // ========== PostponementQueryController ==========

    @Test
    void 연기요청_목록_조회_페이징() throws Exception {
        PostponementResponse item = PostponementResponse.builder()
                .seq(1L).memberName("홍길동").phoneNumber("01012345678")
                .startDate(LocalDate.of(2026, 4, 1)).endDate(LocalDate.of(2026, 4, 15))
                .reason("개인 사정").status(RequestStatus.대기)
                .createdDate(LocalDateTime.now())
                .build();

        given(postponementQueryMapper.search(eq(1L), isNull(), isNull(), eq(0), eq(20)))
                .willReturn(List.of(item));
        given(postponementQueryMapper.count(eq(1L), isNull(), isNull()))
                .willReturn(1);

        mockMvc.perform(get("/api/complex/postponements")
                        .with(auth())
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].memberName").value("홍길동"));
    }

    @Test
    void 회원별_연기요청_이력_조회() throws Exception {
        PostponementResponse item = PostponementResponse.builder()
                .seq(1L).memberName("홍길동").status(RequestStatus.승인).build();

        given(postponementQueryMapper.findByMemberSeq(eq(10L)))
                .willReturn(List.of(item));

        mockMvc.perform(get("/api/complex/postponements/member/{memberSeq}", 10L)
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].status").value("승인"));
    }

    // ========== PostponementController ==========

    @Test
    void 연기요청_상태_승인으로_변경() throws Exception {
        PostponementResponse response = PostponementResponse.builder()
                .seq(1L).status(RequestStatus.승인).build();

        given(postponementService.updateStatus(eq(1L), eq(RequestStatus.승인), isNull()))
                .willReturn(response);

        mockMvc.perform(put("/api/complex/postponements/{seq}/status", 1L)
                        .with(auth())
                        .param("status", "승인"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("상태 변경 완료"))
                .andExpect(jsonPath("$.data.status").value("승인"));
    }

    @Test
    void 연기요청_상태_반려로_변경() throws Exception {
        PostponementResponse response = PostponementResponse.builder()
                .seq(1L).status(RequestStatus.반려).adminMessage("사유 부족").build();

        given(postponementService.updateStatus(eq(1L), eq(RequestStatus.반려), eq("사유 부족")))
                .willReturn(response);

        mockMvc.perform(put("/api/complex/postponements/{seq}/status", 1L)
                        .with(auth())
                        .param("status", "반려")
                        .param("adminMessage", "사유 부족"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("반려"))
                .andExpect(jsonPath("$.data.adminMessage").value("사유 부족"));
    }

    @Test
    void 연기사유_목록_조회() throws Exception {
        ReasonDto.Response reason = ReasonDto.Response.builder()
                .seq(1L).reason("개인 사정").createdDate(LocalDateTime.now()).build();

        given(postponementService.reasons(eq(1L))).willReturn(List.of(reason));

        mockMvc.perform(get("/api/complex/postponements/reasons")
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].reason").value("개인 사정"));
    }

    @Test
    void 연기사유_추가() throws Exception {
        ReasonDto.Response response = ReasonDto.Response.builder()
                .seq(2L).reason("건강 문제").createdDate(LocalDateTime.now()).build();

        given(postponementService.addReason(any(), eq(1L))).willReturn(response);

        Map<String, String> body = Map.of("reason", "건강 문제");

        mockMvc.perform(post("/api/complex/postponements/reasons")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("연기사유 추가 완료"))
                .andExpect(jsonPath("$.data.reason").value("건강 문제"));
    }

    @Test
    void 연기사유_삭제() throws Exception {
        willDoNothing().given(postponementService).deleteReason(eq(1L));

        mockMvc.perform(delete("/api/complex/postponements/reasons/{seq}", 1L)
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("연기사유 삭제 완료"));
    }

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/complex/postponements"))
                .andExpect(status().isUnauthorized());
    }
}
