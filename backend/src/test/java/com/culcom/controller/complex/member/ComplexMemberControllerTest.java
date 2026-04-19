package com.culcom.controller.complex.member;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.member.*;
import com.culcom.entity.enums.MembershipStatus;
import com.culcom.entity.enums.PaymentKind;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.ComplexMemberService;
import com.culcom.service.MemberClassService;
import com.culcom.service.MemberMembershipService;
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
class ComplexMemberControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean ComplexMemberService complexMemberService;
    @MockBean MemberMembershipService memberMembershipService;
    @MockBean MemberClassService memberClassService;

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

    private ComplexMemberResponse sampleMemberResponse() {
        return ComplexMemberResponse.builder()
                .seq(1L)
                .name("홍길동")
                .phoneNumber("01012345678")
                .level("중급")
                .language("한국어")
                .info("테스트 정보")
                .comment("테스트 코멘트")
                .joinDate(LocalDateTime.now())
                .signupChannel("온라인")
                .createdDate(LocalDateTime.now())
                .lastUpdateDate(LocalDateTime.now())
                .build();
    }

    private ComplexMemberMembershipResponse sampleMembershipResponse() {
        return ComplexMemberMembershipResponse.builder()
                .seq(10L)
                .memberSeq(1L)
                .membershipSeq(5L)
                .membershipName("기본 멤버십")
                .startDate(LocalDate.now())
                .expiryDate(LocalDate.now().plusMonths(1))
                .totalCount(10)
                .usedCount(2)
                .status(MembershipStatus.활성)
                .createdDate(LocalDateTime.now())
                .build();
    }

    // ========== 1. 회원 단건 조회 성공 ==========

    @Test
    void 회원_단건_조회_성공() throws Exception {
        given(complexMemberService.get(1L)).willReturn(sampleMemberResponse());

        mockMvc.perform(get("/api/complex/members/{seq}", 1L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.seq").value(1))
                .andExpect(jsonPath("$.data.name").value("홍길동"))
                .andExpect(jsonPath("$.data.phoneNumber").value("01012345678"));
    }

    // ========== 2. 회원 생성 성공 ==========

    @Test
    void 회원_생성_성공() throws Exception {
        given(complexMemberService.create(any(), eq(1L)))
                .willReturn(sampleMemberResponse());

        Map<String, Object> body = Map.of(
                "name", "홍길동",
                "phoneNumber", "01012345678",
                "info", "테스트 정보",
                "comment", "테스트 코멘트");

        mockMvc.perform(post("/api/complex/members")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("회원 추가 완료"))
                .andExpect(jsonPath("$.data.name").value("홍길동"));
    }

    // ========== 3. 회원 생성시 name 빈값이면 400 ==========

    @Test
    void 회원_생성시_name_빈값이면_400() throws Exception {
        Map<String, Object> body = Map.of(
                "name", "",
                "phoneNumber", "01012345678");

        mockMvc.perform(post("/api/complex/members")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ========== 4. 회원 생성시 phoneNumber 빈값이면 400 ==========

    @Test
    void 회원_생성시_phoneNumber_빈값이면_400() throws Exception {
        Map<String, Object> body = Map.of(
                "name", "홍길동",
                "phoneNumber", "");

        mockMvc.perform(post("/api/complex/members")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ========== 5. 회원 수정 성공 ==========

    @Test
    void 회원_수정_성공() throws Exception {
        ComplexMemberResponse updated = ComplexMemberResponse.builder()
                .seq(1L).name("수정된이름").phoneNumber("01099998888")
                .createdDate(LocalDateTime.now()).lastUpdateDate(LocalDateTime.now())
                .build();
        given(complexMemberService.update(eq(1L), any())).willReturn(updated);

        Map<String, Object> body = Map.of(
                "name", "수정된이름",
                "phoneNumber", "01099998888");

        mockMvc.perform(put("/api/complex/members/{seq}", 1L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("회원 수정 완료"))
                .andExpect(jsonPath("$.data.name").value("수정된이름"));
    }

    // ========== 6. 메타데이터 수정 성공 ==========

    @Test
    void 메타데이터_수정_성공() throws Exception {
        ComplexMemberResponse resp = ComplexMemberResponse.builder()
                .seq(1L).name("홍길동").phoneNumber("01012345678")
                .level("고급").language("영어").signupChannel("오프라인")
                .createdDate(LocalDateTime.now()).lastUpdateDate(LocalDateTime.now())
                .build();
        given(complexMemberService.updateMetaData(eq(1L), any())).willReturn(resp);

        Map<String, Object> body = Map.of(
                "level", "고급",
                "language", "영어",
                "signupChannel", "오프라인");

        mockMvc.perform(put("/api/complex/members/{seq}/metadata", 1L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("메타데이터 수정 완료"))
                .andExpect(jsonPath("$.data.level").value("고급"));
    }

    // ========== 7. 멤버십 할당 성공 ==========

    @Test
    void 멤버십_할당_성공() throws Exception {
        given(memberMembershipService.assignMembership(eq(1L), any()))
                .willReturn(sampleMembershipResponse());

        Map<String, Object> body = Map.of(
                "membershipSeq", 5,
                "startDate", "2026-04-01",
                "expiryDate", "2026-05-01");

        mockMvc.perform(post("/api/complex/members/{seq}/memberships", 1L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("멤버십 할당 완료"))
                .andExpect(jsonPath("$.data.membershipSeq").value(5));
    }

    // ========== 8. 멤버십 할당시 membershipSeq 없으면 400 ==========

    @Test
    void 멤버십_할당시_membershipSeq_없으면_400() throws Exception {
        Map<String, Object> body = Map.of(
                "startDate", "2026-04-01");

        mockMvc.perform(post("/api/complex/members/{seq}/memberships", 1L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ========== 9. 멤버십 수정 성공 ==========

    @Test
    void 멤버십_수정_성공() throws Exception {
        given(memberMembershipService.updateMembership(eq(1L), eq(10L), any()))
                .willReturn(sampleMembershipResponse());

        Map<String, Object> body = Map.of(
                "membershipSeq", 5,
                "startDate", "2026-04-01",
                "expiryDate", "2026-06-01");

        mockMvc.perform(put("/api/complex/members/{seq}/memberships/{mmSeq}", 1L, 10L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("멤버십 수정 완료"));
    }

    // ========== 10. 납부기록 조회 성공 ==========

    @Test
    void 납부기록_조회_성공() throws Exception {
        MembershipPaymentResponse paymentResp = MembershipPaymentResponse.builder()
                .seq(100L)
                .memberMembershipSeq(10L)
                .amount(50000L)
                .paidDate(LocalDateTime.now())
                .method("카드")
                .kind(PaymentKind.DEPOSIT)
                .note("테스트 납부")
                .createdDate(LocalDateTime.now())
                .build();
        given(memberMembershipService.listPayments(1L, 10L)).willReturn(List.of(paymentResp));

        mockMvc.perform(get("/api/complex/members/{seq}/memberships/{mmSeq}/payments", 1L, 10L)
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].amount").value(50000));
    }

    // ========== 12. 수업 배정 성공 ==========

    @Test
    void 수업_배정_성공() throws Exception {
        willDoNothing().given(memberClassService).assignClass(1L, 5L);

        mockMvc.perform(post("/api/complex/members/{seq}/class/{classSeq}", 1L, 5L)
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("수업 배정 완료"));
    }

    // ========== 13. 수업 재배정 성공 ==========

    @Test
    void 수업_재배정_성공() throws Exception {
        willDoNothing().given(memberClassService).reassignClass(1L, 5L);

        mockMvc.perform(put("/api/complex/members/{seq}/class/{classSeq}", 1L, 5L)
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("수업 재배정 완료"));
    }

    // ========== 14. 회원 삭제 성공 ==========

    @Test
    void 회원_삭제_성공() throws Exception {
        willDoNothing().given(complexMemberService).delete(1L);

        mockMvc.perform(delete("/api/complex/members/{seq}", 1L)
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("회원 삭제 완료"));
    }

    // ========== 15. 인증 없으면 401 ==========

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/complex/members/{seq}", 1L))
                .andExpect(status().isUnauthorized());
    }
}
