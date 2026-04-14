package com.culcom.controller.publicapi;

import com.culcom.dto.transfer.TransferPublicInfoResponse;
import com.culcom.service.TransferService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PublicTransferControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean TransferService transferService;

    @Test
    @DisplayName("인증_없이_양도_정보_조회_가능")
    void 인증_없이_양도_정보_조회_가능() throws Exception {
        TransferPublicInfoResponse response = TransferPublicInfoResponse.builder()
                .membershipName("테스트 멤버십")
                .fromMemberName("홍길동")
                .remainingCount(10)
                .expiryDate("2026-12-31")
                .transferFee(50000)
                .status("생성")
                .build();

        given(transferService.getByToken(eq("test-token"))).willReturn(response);

        mockMvc.perform(get("/api/public/transfer")
                .param("token", "test-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.membershipName").value("테스트 멤버십"));
    }

    @Test
    @DisplayName("인증_없이_양도_확인_가능")
    void 인증_없이_양도_확인_가능() throws Exception {
        TransferPublicInfoResponse response = TransferPublicInfoResponse.builder()
                .membershipName("테스트 멤버십")
                .fromMemberName("홍길동")
                .remainingCount(10)
                .expiryDate("2026-12-31")
                .transferFee(50000)
                .status("확인")
                .inviteToken("invite-token-123")
                .build();

        given(transferService.confirmAndGenerateInvite(eq("test-token"))).willReturn(response);

        mockMvc.perform(post("/api/public/transfer/confirm")
                .param("token", "test-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.inviteToken").value("invite-token-123"));
    }

    @Test
    @DisplayName("인증_필요한_API는_401_반환")
    void 인증_필요한_API는_401_반환() throws Exception {
        mockMvc.perform(get("/api/transfer-requests"))
            .andExpect(status().isUnauthorized());
    }
}
