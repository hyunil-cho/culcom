package com.culcom.controller.publicapi;

import com.culcom.config.ZapierProperties;
import com.culcom.entity.branch.Branch;
import com.culcom.repository.BranchRepository;
import com.culcom.repository.CustomerRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Zapier 웹훅 컨트롤러:
 * 유효한 시크릿 헤더 + 유효한 payload → 200, Customer 저장
 * 잘못된 시크릿 → 401
 * 유효한 시크릿 + 없는 location → 400
 * 유효한 시크릿 + 필수 필드 누락 → 400
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ZapierControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired ZapierProperties zapierProperties;
    @Autowired BranchRepository branchRepository;
    @Autowired CustomerRepository customerRepository;

    String alias;

    @BeforeEach
    void setUp() {
        zapierProperties.setSecret("test-secret");
        alias = "zapier-" + System.nanoTime();
        branchRepository.save(Branch.builder().branchName("테스트지점").alias(alias).build());
    }

    @Test
    @DisplayName("유효한 시크릿 + 유효한 payload 는 200 + Customer 저장")
    void 정상_등록() throws Exception {
        long before = customerRepository.count();

        String body = objectMapper.writeValueAsString(Map.of(
                "name", "홍길동",
                "phone", "010-1234-5678",
                "adName", "테스트상호",
                "adSource", "META",
                "location", alias
        ));

        mockMvc.perform(post("/api/public/zapier/customer")
                        .header("X-Webhook-Token", "test-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.seq").exists());

        assertThat(customerRepository.count()).isEqualTo(before + 1);
    }

    @Test
    @DisplayName("잘못된 시크릿 토큰은 401")
    void 잘못된_시크릿_401() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "name", "홍길동",
                "phone", "01012345678",
                "location", alias
        ));

        mockMvc.perform(post("/api/public/zapier/customer")
                        .header("X-Webhook-Token", "WRONG")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("헤더 자체가 없으면 401")
    void 헤더_없음_401() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "name", "홍길동",
                "phone", "01012345678",
                "location", alias
        ));

        mockMvc.perform(post("/api/public/zapier/customer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("없는 location 은 400")
    void 존재하지_않는_지점_400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "name", "홍길동",
                "phone", "01012345678",
                "location", "no-such-alias"
        ));

        mockMvc.perform(post("/api/public/zapier/customer")
                        .header("X-Webhook-Token", "test-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("존재하지 않는 지점")));
    }

    @Test
    @DisplayName("필수 필드 누락 시 400")
    void 필수필드_누락_400() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "phone", "01012345678",
                "location", alias
        ));

        mockMvc.perform(post("/api/public/zapier/customer")
                        .header("X-Webhook-Token", "test-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }
}
