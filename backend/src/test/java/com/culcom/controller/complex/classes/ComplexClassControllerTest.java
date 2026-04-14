package com.culcom.controller.complex.classes;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.classes.ComplexClassRequest;
import com.culcom.dto.complex.classes.ComplexClassResponse;
import com.culcom.dto.complex.member.ComplexMemberResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.ComplexClassService;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.bytebuddy.asm.Advice;
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
class ComplexClassControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean ComplexClassService complexClassService;

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

    private ComplexClassResponse sampleClassResponse() {
        return ComplexClassResponse.builder()
                .seq(1L)
                .name("초급반")
                .description("초급자를 위한 수업")
                .capacity(20)
                .sortOrder(1)
                .timeSlotSeq(10L)
                .timeSlotName("월수금 10:00-11:00")
                .staffSeq(5L)
                .staffName("김강사")
                .memberCount(15)
                .createdDate(LocalDateTime.now())
                .build();
    }

    // ========== 1. 수업 단건 조회 성공 ==========

    @Test
    void 수업_단건_조회_성공() throws Exception {
        given(complexClassService.get(1L)).willReturn(sampleClassResponse());

        mockMvc.perform(get("/api/complex/classes/{seq}", 1L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.seq").value(1))
                .andExpect(jsonPath("$.data.name").value("초급반"))
                .andExpect(jsonPath("$.data.capacity").value(20));
    }

    // ========== 2. 수업 생성 성공 ==========

    @Test
    void 수업_생성_성공() throws Exception {
        given(complexClassService.create(ArgumentMatchers.any(ComplexClassRequest.class), eq(1L)))
                .willReturn(sampleClassResponse());

        Map<String, Object> body = Map.of(
                "name", "초급반",
                "description", "초급자를 위한 수업",
                "capacity", 20,
                "sortOrder", 1,
                "timeSlotSeq", 10);

        mockMvc.perform(post("/api/complex/classes")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("수업 추가 완료"))
                .andExpect(jsonPath("$.data.name").value("초급반"));
    }

    // ========== 3. 수업 생성시 name 빈값이면 400 ==========

    @Test
    void 수업_생성시_name_빈값이면_400() throws Exception {
        Map<String, Object> body = Map.of(
                "name", "",
                "timeSlotSeq", 10);

        mockMvc.perform(post("/api/complex/classes")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ========== 4. 수업 생성시 timeSlotSeq 없으면 400 ==========

    @Test
    void 수업_생성시_timeSlotSeq_없으면_400() throws Exception {
        Map<String, Object> body = Map.of(
                "name", "초급반");

        mockMvc.perform(post("/api/complex/classes")
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ========== 5. 수업 수정 성공 ==========

    @Test
    void 수업_수정_성공() throws Exception {
        ComplexClassResponse updated = ComplexClassResponse.builder()
                .seq(1L).name("중급반").description("수정된 설명")
                .capacity(25).sortOrder(2).timeSlotSeq(10L).timeSlotName("월수금 10:00-11:00")
                .createdDate(LocalDateTime.now())
                .build();
        given(complexClassService.update(eq(1L), ArgumentMatchers.any(ComplexClassRequest.class))).willReturn(updated);

        Map<String, Object> body = Map.of(
                "name", "중급반",
                "description", "수정된 설명",
                "capacity", 25,
                "timeSlotSeq", 10);

        mockMvc.perform(put("/api/complex/classes/{seq}", 1L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("수업 수정 완료"))
                .andExpect(jsonPath("$.data.name").value("중급반"));
    }

    // ========== 6. 수업 삭제 성공 ==========

    @Test
    void 수업_삭제_성공() throws Exception {
        willDoNothing().given(complexClassService).delete(1L);

        mockMvc.perform(delete("/api/complex/classes/{seq}", 1L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("수업 삭제 완료"));
    }

    // ========== 7. 수업 멤버 목록 조회 ==========

    @Test
    void 수업_멤버_목록_조회() throws Exception {
        ComplexMemberResponse member = ComplexMemberResponse.builder()
                .seq(1L).name("홍길동").phoneNumber("01012345678")
                .createdDate(LocalDateTime.now()).lastUpdateDate(LocalDateTime.now())
                .build();
        given(complexClassService.listMembers(1L)).willReturn(List.of(member));

        mockMvc.perform(get("/api/complex/classes/{seq}/members", 1L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("홍길동"));
    }

    // ========== 8. 수업 멤버 추가 ==========

    @Test
    void 수업_멤버_추가() throws Exception {
        willDoNothing().given(complexClassService).addMember(1L, 2L);

        mockMvc.perform(post("/api/complex/classes/{seq}/members/{memberSeq}", 1L, 2L)
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("팀에 멤버 추가 완료"));
    }

    // ========== 9. 수업 멤버 제외 ==========

    @Test
    void 수업_멤버_제외() throws Exception {
        willDoNothing().given(complexClassService).removeMember(1L, 2L);

        mockMvc.perform(delete("/api/complex/classes/{seq}/members/{memberSeq}", 1L, 2L)
                        .with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("팀에서 멤버 제외 완료"));
    }

    // ========== 10. 리더 변경 성공 ==========

    @Test
    void 리더_변경_성공() throws Exception {
        ComplexClassResponse resp = ComplexClassResponse.builder()
                .seq(1L).name("초급반").staffSeq(7L).staffName("박강사")
                .timeSlotSeq(10L).timeSlotName("월수금 10:00-11:00")
                .createdDate(LocalDateTime.now())
                .build();
        given(complexClassService.setLeader(eq(1L), eq(7L))).willReturn(resp);

        Map<String, Object> body = Map.of("staffSeq", 7);

        mockMvc.perform(put("/api/complex/classes/{seq}/leader", 1L)
                        .with(auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("리더 변경 완료"))
                .andExpect(jsonPath("$.data.staffSeq").value(7));
    }

    // ========== 11. 인증 없으면 401 ==========

    @Test
    void 인증_없으면_401() throws Exception {
        mockMvc.perform(get("/api/complex/classes/{seq}", 1L))
                .andExpect(status().isUnauthorized());
    }
}
