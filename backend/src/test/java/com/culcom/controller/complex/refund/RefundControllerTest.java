package com.culcom.controller.complex.refund;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.ReasonDto;
import com.culcom.dto.complex.refund.RefundResponse;
import com.culcom.entity.enums.RequestStatus;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.RefundQueryMapper;
import com.culcom.service.RefundService;
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
class RefundControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean RefundService refundService;
    @MockBean RefundQueryMapper refundQueryMapper;

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

    // ========== RefundQueryController ==========

    @Test
    void 환불요청_목록_조회_페이징() throws Exception {
        RefundResponse item = RefundResponse.builder()
                .seq(1L).memberName("홍길동").phoneNumber("01012345678")
                .membershipName("3개월권").price("300000")
                .reason("개인 사정").status(RequestStatus.대기)
                .createdDate(LocalDateTime.now())
                .build();

        given(refundQueryMapper.search(eq(1L), isNull(), isNull(), eq(0), eq(20)))
                .willReturn(List.of(item));
        given(refundQueryMapper.count(eq(1L), isNull(), isNull()))
                .willReturn(1);

        mockMvc.perform(get("/api/complex/refunds")
                        .with(auth())
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].memberName").value("홍길동"));
    }

    // ========== RefundController ==========

    @Test
    void 환불요청_생성_성공() throws Exception {
        RefundResponse response = RefundResponse.builder()
                .seq(1L).memberName("홍길동").status(RequestStatus.대기)
                .membershipName("3개월권").price("300000")
                .build();

        given(refundService.create(any(), eq(1L))).willReturn(response);

        Map<String, Object> body = new HashMap<>();
        body.put("memberSeq", 10L);
        body.put("memberMembershipSeq", 20L);
        body.put("memberName", "홍길동");
        body.put("phoneNumber", "01012345678");
        body.put("membershipName", "3개월권");
        body.put("price", "300000");
        body.put("reason", "개인 사정");
        mockMvc.perform(post("/api/complex/refunds")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("환불 요청 등록 완료"))
                .andExpect(jsonPath("$.data.memberName").value("홍길동"));
    }

    @Test
    void 환불요청_생성시_memberSeq_없으면_400() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("memberMembershipSeq", 20L);
        body.put("memberName", "홍길동");

        mockMvc.perform(post("/api/complex/refunds")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 환불요청_생성시_memberName_빈값이면_400() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("memberSeq", 10L);
        body.put("memberMembershipSeq", 20L);
        body.put("memberName", "");

        mockMvc.perform(post("/api/complex/refunds")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 환불요청_상태_승인으로_변경() throws Exception {
        RefundResponse response = RefundResponse.builder()
                .seq(1L).status(RequestStatus.승인).build();

        given(refundService.updateStatus(eq(1L), eq(RequestStatus.승인), isNull()))
                .willReturn(response);

        mockMvc.perform(put("/api/complex/refunds/{seq}/status", 1L)
                        .with(auth())
                        .param("status", "승인"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("상태 변경 완료"))
                .andExpect(jsonPath("$.data.status").value("승인"));
    }

    @Test
    void 환불요청_상태_반려로_변경() throws Exception {
        RefundResponse response = RefundResponse.builder()
                .seq(1L).status(RequestStatus.반려).rejectReason("서류 미비").build();

        given(refundService.updateStatus(eq(1L), eq(RequestStatus.반려), eq("서류 미비")))
                .willReturn(response);

        mockMvc.perform(put("/api/complex/refunds/{seq}/status", 1L)
                        .with(auth())
                        .param("status", "반려")
                        .param("rejectReason", "서류 미비"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("반려"))
                .andExpect(jsonPath("$.data.rejectReason").value("서류 미비"));
    }

    @Test
    void 환불사유_목록_조회() throws Exception {
        ReasonDto.Response reason = ReasonDto.Response.builder()
                .seq(1L).reason("개인 사정").createdDate(LocalDateTime.now()).build();

        given(refundService.reasons(eq(1L))).willReturn(List.of(reason));

        mockMvc.perform(get("/api/complex/refunds/reasons")
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].reason").value("개인 사정"));
    }

    @Test
    void 환불사유_추가() throws Exception {
        ReasonDto.Response response = ReasonDto.Response.builder()
                .seq(2L).reason("이사").createdDate(LocalDateTime.now()).build();

        given(refundService.addReason(any(), eq(1L))).willReturn(response);

        Map<String, String> body = Map.of("reason", "이사");

        mockMvc.perform(post("/api/complex/refunds/reasons")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reason").value("이사"));
    }

    @Test
    void 환불사유_삭제() throws Exception {
        willDoNothing().given(refundService).deleteReason(eq(1L));

        mockMvc.perform(delete("/api/complex/refunds/reasons/{seq}", 1L)
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/complex/refunds"))
                .andExpect(status().isUnauthorized());
    }
}
