package com.culcom.controller.complex.staff;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.member.*;
import com.culcom.entity.enums.StaffStatus;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.MemberActivityMapper;
import com.culcom.service.ComplexStaffService;
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
class ComplexStaffControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean ComplexStaffService complexStaffService;
    @MockBean MemberActivityMapper memberActivityMapper;

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

    private ComplexStaffResponse sampleStaffResponse() {
        return ComplexStaffResponse.builder()
                .seq(1L)
                .name("김강사")
                .phoneNumber("01011112222")
                .branchName("테스트지점")
                .status(StaffStatus.재직)
                .createdDate(LocalDateTime.now())
                .lastUpdateDate(LocalDateTime.now())
                .build();
    }

    // ========== 1. 스태프 목록 조회 ==========

    @Test
    void 스태프_목록_조회() throws Exception {
        given(complexStaffService.list(1L)).willReturn(List.of(sampleStaffResponse()));

        mockMvc.perform(get("/api/complex/staffs").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("김강사"));
    }

    // ========== 2. 스태프 단건 조회 ==========

    @Test
    void 스태프_단건_조회() throws Exception {
        given(complexStaffService.get(1L)).willReturn(sampleStaffResponse());

        mockMvc.perform(get("/api/complex/staffs/{seq}", 1L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.seq").value(1))
                .andExpect(jsonPath("$.data.name").value("김강사"))
                .andExpect(jsonPath("$.data.phoneNumber").value("01011112222"));
    }

    // ========== 3. 스태프 생성 성공 ==========

    @Test
    void 스태프_생성_성공() throws Exception {
        given(complexStaffService.create(any(), eq(1L)))
                .willReturn(sampleStaffResponse());

        Map<String, Object> body = Map.of(
                "name", "김강사",
                "phoneNumber", "01011112222",
                "status", "재직");

        mockMvc.perform(post("/api/complex/staffs")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("스태프 추가 완료"))
                .andExpect(jsonPath("$.data.name").value("김강사"));
    }

    // ========== 4. 스태프 생성시 name 빈값이면 400 ==========

    @Test
    void 스태프_생성시_name_빈값이면_400() throws Exception {
        Map<String, Object> body = Map.of(
                "name", "",
                "phoneNumber", "01011112222");

        mockMvc.perform(post("/api/complex/staffs")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ========== 5. 스태프 생성시 phoneNumber 빈값이면 400 ==========

    @Test
    void 스태프_생성시_phoneNumber_빈값이면_400() throws Exception {
        Map<String, Object> body = Map.of(
                "name", "김강사",
                "phoneNumber", "");

        mockMvc.perform(post("/api/complex/staffs")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ========== 6. 스태프 수정 성공 ==========

    @Test
    void 스태프_수정_성공() throws Exception {
        ComplexStaffResponse updated = ComplexStaffResponse.builder()
                .seq(1L).name("수정강사").phoneNumber("01099998888")
                .branchName("테스트지점").status(StaffStatus.재직)
                .createdDate(LocalDateTime.now()).lastUpdateDate(LocalDateTime.now())
                .build();
        given(complexStaffService.update(eq(1L), any())).willReturn(updated);

        Map<String, Object> body = Map.of(
                "name", "수정강사",
                "phoneNumber", "01099998888");

        mockMvc.perform(put("/api/complex/staffs/{seq}", 1L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("스태프 수정 완료"))
                .andExpect(jsonPath("$.data.name").value("수정강사"));
    }

    // ========== 7. 스태프 삭제 성공 ==========

    @Test
    void 스태프_삭제_성공() throws Exception {
        willDoNothing().given(complexStaffService).delete(1L);

        mockMvc.perform(delete("/api/complex/staffs/{seq}", 1L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("스태프 삭제 완료"));
    }

    // ========== 8. 환급정보 조회 ==========

    @Test
    void 환급정보_조회() throws Exception {
        ComplexStaffRefundInfoResponse refundResp = ComplexStaffRefundInfoResponse.builder()
                .seq(1L)
                .memberSeq(1L)
                .depositAmount("100000")
                .refundableDeposit("80000")
                .nonRefundableDeposit("20000")
                .refundBank("국민은행")
                .refundAccount("123-456-789")
                .refundAmount("80000")
                .paymentMethod("계좌이체")
                .build();
        given(complexStaffService.getRefundInfo(1L)).willReturn(refundResp);

        mockMvc.perform(get("/api/complex/staffs/{staffSeq}/refund", 1L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.depositAmount").value("100000"))
                .andExpect(jsonPath("$.data.refundBank").value("국민은행"));
    }

    // ========== 9. 환급정보 저장 ==========

    @Test
    void 환급정보_저장() throws Exception {
        ComplexStaffRefundInfoResponse refundResp = ComplexStaffRefundInfoResponse.builder()
                .seq(1L)
                .memberSeq(1L)
                .depositAmount("100000")
                .refundBank("국민은행")
                .refundAccount("123-456-789")
                .build();
        given(complexStaffService.saveRefundInfo(eq(1L), any()))
                .willReturn(refundResp);

        Map<String, Object> body = Map.of(
                "depositAmount", "100000",
                "refundBank", "국민은행",
                "refundAccount", "123-456-789");

        mockMvc.perform(post("/api/complex/staffs/{staffSeq}/refund", 1L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("환급 정보 저장 완료"))
                .andExpect(jsonPath("$.data.depositAmount").value("100000"));
    }

    // ========== 10. 환급정보 삭제 ==========

    @Test
    void 환급정보_삭제() throws Exception {
        willDoNothing().given(complexStaffService).deleteRefundInfo(1L);

        mockMvc.perform(delete("/api/complex/staffs/{staffSeq}/refund", 1L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("환급 정보 삭제 완료"));
    }

    // ========== 11. 타임라인 조회 ==========

    @Test
    void 타임라인_조회() throws Exception {
        MemberActivityTimelineItem item = new MemberActivityTimelineItem(
                "MEMBERSHIP_REGISTER", "2026-04-14", "멤버십 등록", "기본 멤버십", "완료");
        given(memberActivityMapper.selectStaffTimeline(eq(1L), eq(0), eq(20)))
                .willReturn(List.of(item));
        given(memberActivityMapper.countStaffTimeline(1L)).willReturn(1);

        mockMvc.perform(get("/api/complex/staffs/{staffSeq}/timeline", 1L)
                        .param("page", "0")
                        .param("size", "20")
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].type").value("MEMBERSHIP_REGISTER"))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    // ========== 12. 인증 없으면 401 ==========

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/complex/staffs"))
                .andExpect(status().isUnauthorized());
    }
}
