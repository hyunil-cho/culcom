package com.culcom.controller.complex.member;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.complex.member.OutstandingItemResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.service.OutstandingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OutstandingController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class OutstandingControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean OutstandingService outstandingService;

    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, 4L);
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    private OutstandingItemResponse sample(long seq, String name, long outstanding) {
        return OutstandingItemResponse.builder()
                .memberSeq(seq).memberName(name).phoneNumber("01011112222")
                .memberMembershipSeq(seq * 10).membershipName("6개월 회원권")
                .price(100000L).paidAmount(100000L - outstanding).outstanding(outstanding)
                .daysSinceLastPaid(10L).paymentStatus("부분납부")
                .build();
    }

    @Test
    @DisplayName("미수금_목록_기본")
    void 기본() throws Exception {
        given(outstandingService.list(anyLong(), any(), any(), any()))
                .willReturn(new PageImpl<>(List.of(sample(1L, "홍길동", 50000L)),
                        PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/complex/outstanding").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].outstanding").value(50000));

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(outstandingService).list(eq(4L), isNull(),
                eq(OutstandingService.SortKey.OUTSTANDING_DESC),
                pageableCaptor.capture());

        Pageable captured = pageableCaptor.getValue();
        org.assertj.core.api.Assertions.assertThat(captured.getPageNumber()).isEqualTo(0);
        org.assertj.core.api.Assertions.assertThat(captured.getPageSize()).isEqualTo(20);
    }

    @Test
    @DisplayName("미수금_정렬_키워드_페이지")
    void 정렬_키워드() throws Exception {
        given(outstandingService.list(anyLong(), any(), any(), any()))
                .willReturn(new PageImpl<>(List.of(), PageRequest.of(1, 5), 0));

        mockMvc.perform(get("/api/complex/outstanding")
                        .with(auth())
                        .param("keyword", "홍")
                        .param("sort", "NAME")
                        .param("page", "1")
                        .param("size", "5"))
                .andExpect(status().isOk());

        verify(outstandingService).list(eq(4L), eq("홍"),
                eq(OutstandingService.SortKey.NAME), any());
    }

    @Test
    @DisplayName("잘못된_sort_enum_400")
    void 잘못된_sort() throws Exception {
        mockMvc.perform(get("/api/complex/outstanding")
                        .with(auth())
                        .param("sort", "INVALID_VALUE"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("인증없으면_401")
    void 인증없음() throws Exception {
        mockMvc.perform(get("/api/complex/outstanding"))
                .andExpect(status().isUnauthorized());
    }
}
