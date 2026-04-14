package com.culcom.controller.publicapi;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.publicapi.MemberInfo;
import com.culcom.dto.publicapi.MemberSearchResponse;
import com.culcom.dto.publicapi.PostponementSubmitResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.PublicPostponementService;
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
class PublicPostponementControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean PublicPostponementService publicPostponementService;

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
    @DisplayName("회원_검색_성공")
    void 회원_검색_성공() throws Exception {
        MemberInfo memberInfo = new MemberInfo(1L, "홍길동", "01012345678", 1L, "본점", "초급", List.of(), List.of());
        MemberSearchResponse response = new MemberSearchResponse(List.of(memberInfo));
        given(publicPostponementService.searchMember("홍길동", "01012345678")).willReturn(response);

        mockMvc.perform(get("/api/public/postponement/search-member")
                .param("name", "홍길동")
                .param("phone", "01012345678"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.members", hasSize(1)))
            .andExpect(jsonPath("$.data.members[0].name").value("홍길동"));
    }

    @Test
    @DisplayName("연기요청_제출_성공")
    void 연기요청_제출_성공() throws Exception {
        PostponementSubmitResponse response = new PostponementSubmitResponse(
            "홍길동", "01012345678", "본점", "2026-05-01", "2026-05-15", "개인 사유");
        given(publicPostponementService.submit(any())).willReturn(response);

        Map<String, Object> body = new HashMap<>();
        body.put("name", "홍길동");
        body.put("phone", "01012345678");
        body.put("branchSeq", 1);
        body.put("memberSeq", 1);
        body.put("memberMembershipSeq", 1);
        body.put("startDate", "2026-05-01");
        body.put("endDate", "2026-05-15");
        body.put("reason", "개인 사유");

        mockMvc.perform(post("/api/public/postponement/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("연기 요청이 접수되었습니다."))
            .andExpect(jsonPath("$.data.name").value("홍길동"));
    }

    @Test
    @DisplayName("연기사유_목록_조회")
    void 연기사유_목록_조회() throws Exception {
        given(publicPostponementService.reasons(1L)).willReturn(List.of("개인 사유", "건강 문제", "기타"));

        mockMvc.perform(get("/api/public/postponement/reasons")
                .param("branchSeq", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data", hasSize(3)))
            .andExpect(jsonPath("$.data[0]").value("개인 사유"));
    }

    @Test
    @DisplayName("인증_없이도_접근_가능")
    void 인증_없이도_접근_가능() throws Exception {
        given(publicPostponementService.reasons(1L)).willReturn(List.of());

        mockMvc.perform(get("/api/public/postponement/reasons")
                .param("branchSeq", "1"))
            .andExpect(status().isOk());
    }
}
