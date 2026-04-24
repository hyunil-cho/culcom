package com.culcom.controller.complex.member;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.member.ComplexMemberResponse;
import com.culcom.dto.complex.member.MemberActivityTimelineItem;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.ComplexMemberQueryMapper;
import com.culcom.mapper.MemberActivityMapper;
import com.culcom.service.ComplexMemberService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ComplexMemberQueryController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class ComplexMemberQueryControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean ComplexMemberQueryMapper complexMemberQueryMapper;
    @MockBean MemberActivityMapper memberActivityMapper;
    @MockBean ComplexMemberService complexMemberService;

    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, 7L);
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    private ComplexMemberResponse sampleMember(long seq, String name) {
        return ComplexMemberResponse.builder().seq(seq).name(name).phoneNumber("01011112222").build();
    }

    @Test
    @DisplayName("회원_목록_조회_기본")
    void 목록_기본() throws Exception {
        given(complexMemberQueryMapper.search(anyLong(), any(), anyInt(), anyInt()))
                .willReturn(List.of(sampleMember(1L, "홍길동"), sampleMember(2L, "김철수")));
        given(complexMemberQueryMapper.count(anyLong(), any())).willReturn(2);

        mockMvc.perform(get("/api/complex/members").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(2)));

        verify(complexMemberQueryMapper).search(eq(7L), isNull(), eq(0), eq(20));
        verify(complexMemberService).populateAttendanceHistory(org.mockito.ArgumentMatchers.anyList());
        verify(complexMemberService).populateFirstPayment(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    @DisplayName("회원_목록_검색어_전달")
    void 목록_검색() throws Exception {
        given(complexMemberQueryMapper.search(anyLong(), any(), anyInt(), anyInt()))
                .willReturn(List.of());
        given(complexMemberQueryMapper.count(anyLong(), any())).willReturn(0);

        mockMvc.perform(get("/api/complex/members")
                        .with(auth())
                        .param("page", "1")
                        .param("size", "10")
                        .param("keyword", "홍"))
                .andExpect(status().isOk());

        verify(complexMemberQueryMapper).search(eq(7L), eq("홍"), eq(10), eq(10));
    }

    @Test
    @DisplayName("회원_타임라인_조회")
    void 타임라인() throws Exception {
        given(memberActivityMapper.selectTimeline(anyLong(), anyInt(), anyInt()))
                .willReturn(List.of());
        given(memberActivityMapper.countTimeline(anyLong())).willReturn(0);

        mockMvc.perform(get("/api/complex/members/{memberSeq}/timeline", 99L).with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(memberActivityMapper).selectTimeline(eq(99L), eq(0), eq(20));
        verify(memberActivityMapper).countTimeline(eq(99L));
    }

    @Test
    @DisplayName("인증없으면_401")
    void 인증없음() throws Exception {
        mockMvc.perform(get("/api/complex/members")).andExpect(status().isUnauthorized());
    }
}
