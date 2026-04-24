package com.culcom.controller.customer;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.customer.CustomerResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.CustomerQueryMapper;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CustomerQueryController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class CustomerQueryControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean CustomerQueryMapper customerQueryMapper;

    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, 5L);
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        return authentication(token);
    }

    private CustomerResponse sample(long seq, String name) {
        return CustomerResponse.builder()
                .seq(seq).name(name).phoneNumber("01012345678")
                .status("신규").callCount(0)
                .build();
    }

    @Test
    @DisplayName("고객_목록_기본")
    void 목록_기본() throws Exception {
        given(customerQueryMapper.search(anyLong(), anyString(), any(), any(), anyInt(), anyInt()))
                .willReturn(List.of(sample(1L, "고객1")));
        given(customerQueryMapper.count(anyLong(), anyString(), any(), any())).willReturn(1);

        mockMvc.perform(get("/api/customers").with(auth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)));

        verify(customerQueryMapper).search(eq(5L), eq("all"), isNull(), isNull(), eq(0), eq(20));
    }

    @Test
    @DisplayName("고객_목록_필터_검색어_전달")
    void 목록_검색() throws Exception {
        given(customerQueryMapper.search(anyLong(), anyString(), any(), any(), anyInt(), anyInt()))
                .willReturn(List.of());
        given(customerQueryMapper.count(anyLong(), anyString(), any(), any())).willReturn(0);

        mockMvc.perform(get("/api/customers")
                        .with(auth())
                        .param("filter", "신규")
                        .param("searchType", "phone")
                        .param("keyword", "1234")
                        .param("page", "2")
                        .param("size", "5"))
                .andExpect(status().isOk());

        verify(customerQueryMapper).search(eq(5L), eq("신규"), eq("phone"), eq("1234"), eq(10), eq(5));
    }

    @Test
    @DisplayName("인증없으면_401")
    void 인증없음() throws Exception {
        mockMvc.perform(get("/api/customers")).andExpect(status().isUnauthorized());
    }
}
