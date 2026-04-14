package com.culcom.controller.complex.membership;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.member.MembershipRequest;
import com.culcom.dto.complex.member.MembershipResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.MembershipService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentMatchers;
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
class MembershipControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean MembershipService membershipService;

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

    private MembershipResponse sampleMembershipResponse() {
        return MembershipResponse.builder()
                .seq(1L)
                .name("기본 멤버십")
                .duration(30)
                .count(10)
                .price(100000)
                .transferable(true)
                .createdDate(LocalDateTime.now())
                .build();
    }

    // ========== 1. 멤버십 목록 조회 ==========

    @Test
    void 멤버십_목록_조회() throws Exception {
        given(membershipService.list()).willReturn(List.of(sampleMembershipResponse()));

        mockMvc.perform(get("/api/memberships").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("기본 멤버십"));
    }

    // ========== 2. 멤버십 단건 조회 ==========

    @Test
    void 멤버십_단건_조회() throws Exception {
        given(membershipService.get(1L)).willReturn(sampleMembershipResponse());

        mockMvc.perform(get("/api/memberships/{seq}", 1L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.seq").value(1))
                .andExpect(jsonPath("$.data.name").value("기본 멤버십"))
                .andExpect(jsonPath("$.data.duration").value(30))
                .andExpect(jsonPath("$.data.count").value(10))
                .andExpect(jsonPath("$.data.price").value(100000));
    }

    // ========== 3. 멤버십 생성 성공 ==========

    @Test
    void 멤버십_생성_성공() throws Exception {
        given(membershipService.create(ArgumentMatchers.any(MembershipRequest.class)))
                .willReturn(sampleMembershipResponse());

        Map<String, Object> body = Map.of(
                "name", "기본 멤버십",
                "duration", 30,
                "count", 10,
                "price", 100000,
                "transferable", true);

        mockMvc.perform(post("/api/memberships")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("멤버십 추가 완료"))
                .andExpect(jsonPath("$.data.name").value("기본 멤버십"));
    }

    // ========== 4. 멤버십 생성시 name 빈값이면 400 ==========

    @Test
    void 멤버십_생성시_name_빈값이면_400() throws Exception {
        Map<String, Object> body = Map.of(
                "name", "",
                "duration", 30,
                "count", 10,
                "price", 100000);

        mockMvc.perform(post("/api/memberships")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ========== 5. 멤버십 생성시 duration 없으면 400 ==========

    @Test
    void 멤버십_생성시_duration_없으면_400() throws Exception {
        Map<String, Object> body = Map.of(
                "name", "기본 멤버십",
                "count", 10,
                "price", 100000);

        mockMvc.perform(post("/api/memberships")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ========== 6. 멤버십 생성시 count 없으면 400 ==========

    @Test
    void 멤버십_생성시_count_없으면_400() throws Exception {
        Map<String, Object> body = Map.of(
                "name", "기본 멤버십",
                "duration", 30,
                "price", 100000);

        mockMvc.perform(post("/api/memberships")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ========== 7. 멤버십 생성시 price 없으면 400 ==========

    @Test
    void 멤버십_생성시_price_없으면_400() throws Exception {
        Map<String, Object> body = Map.of(
                "name", "기본 멤버십",
                "duration", 30,
                "count", 10);

        mockMvc.perform(post("/api/memberships")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ========== 8. 멤버십 수정 성공 ==========

    @Test
    void 멤버십_수정_성공() throws Exception {
        MembershipResponse updated = MembershipResponse.builder()
                .seq(1L).name("수정 멤버십").duration(60).count(20).price(200000)
                .transferable(false).createdDate(LocalDateTime.now())
                .build();
        given(membershipService.update(eq(1L), ArgumentMatchers.any(MembershipRequest.class))).willReturn(updated);

        Map<String, Object> body = Map.of(
                "name", "수정 멤버십",
                "duration", 60,
                "count", 20,
                "price", 200000,
                "transferable", false);

        mockMvc.perform(put("/api/memberships/{seq}", 1L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("멤버십 수정 완료"))
                .andExpect(jsonPath("$.data.name").value("수정 멤버십"));
    }

    // ========== 9. 멤버십 삭제 성공 ==========

    @Test
    void 멤버십_삭제_성공() throws Exception {
        willDoNothing().given(membershipService).delete(1L);

        mockMvc.perform(delete("/api/memberships/{seq}", 1L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("멤버십 삭제 완료"));
    }

    // ========== 10. 인증 없으면 401 ==========

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/memberships"))
                .andExpect(status().isUnauthorized());
    }
}
