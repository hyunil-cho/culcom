package com.culcom.controller.complex.transfer;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.transfer.TransferRequestResponse;
import com.culcom.entity.enums.TransferStatus;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.TransferService;
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
class TransferControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean TransferService transferService;

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
    void 양도요청_목록_조회() throws Exception {
        TransferRequestResponse item = TransferRequestResponse.builder()
                .seq(1L).memberMembershipSeq(10L).membershipName("3개월권")
                .fromMemberName("홍길동").fromMemberPhone("01012345678")
                .status(TransferStatus.생성).createdDate(LocalDateTime.now())
                .build();

        given(transferService.list(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyBoolean(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyBoolean())).willReturn(List.of(item));

        mockMvc.perform(get("/api/transfer-requests")
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].fromMemberName").value("홍길동"));
    }

    @Test
    void 접수상태_양도요청_검색() throws Exception {
        TransferRequestResponse item = TransferRequestResponse.builder()
                .seq(1L).fromMemberName("홍길동").status(TransferStatus.접수)
                .toCustomerName("김철수").build();

        given(transferService.findPendingByRecipient(eq("김철수"), eq("01098765432")))
                .willReturn(item);

        mockMvc.perform(get("/api/transfer-requests/pending")
                        .with(auth())
                        .param("name", "김철수")
                        .param("phone", "01098765432"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.toCustomerName").value("김철수"));
    }

    @Test
    void 양도요청_생성_성공() throws Exception {
        TransferRequestResponse response = TransferRequestResponse.builder()
                .seq(1L).memberMembershipSeq(20L).status(TransferStatus.생성).build();

        given(transferService.create(any())).willReturn(response);

        Map<String, Object> body = Map.of("memberMembershipSeq", 20L);

        mockMvc.perform(post("/api/transfer-requests")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("양도 요청이 생성되었습니다."))
                .andExpect(jsonPath("$.data.status").value("생성"));
    }

    @Test
    void 양도요청_생성시_memberMembershipSeq_없으면_400() throws Exception {
        Map<String, Object> body = new HashMap<>();
        // memberMembershipSeq 누락

        mockMvc.perform(post("/api/transfer-requests")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 양도요청_상태_변경() throws Exception {
        TransferRequestResponse response = TransferRequestResponse.builder()
                .seq(1L).status(TransferStatus.접수).build();

        given(transferService.updateStatus(eq(1L), eq(TransferStatus.접수), any()))
                .willReturn(response);

        mockMvc.perform(put("/api/transfer-requests/{seq}/status", 1L)
                        .with(auth())
                        .param("status", "접수"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("양도 요청 상태가 변경되었습니다."))
                .andExpect(jsonPath("$.data.status").value("접수"));
    }

    @Test
    void 양도_완료처리() throws Exception {
        TransferRequestResponse response = TransferRequestResponse.builder()
                .seq(1L).status(TransferStatus.확인).toCustomerName("김철수").build();

        given(transferService.completeTransfer(eq(1L), eq(100L)))
                .willReturn(response);

        mockMvc.perform(post("/api/transfer-requests/{seq}/complete", 1L)
                        .with(auth())
                        .param("memberSeq", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("양도가 완료되었습니다."))
                .andExpect(jsonPath("$.data.toCustomerName").value("김철수"));
    }

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/transfer-requests"))
                .andExpect(status().isUnauthorized());
    }
}
