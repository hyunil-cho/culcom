package com.culcom.controller.customer;

import com.culcom.config.security.CustomUserPrincipal;
import com.culcom.dto.customer.CustomerResponse;
import com.culcom.entity.enums.UserRole;
import com.culcom.mapper.CustomerQueryMapper;
import com.culcom.service.CustomerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CustomerControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean CustomerService customerService;
    @MockBean CustomerQueryMapper customerQueryMapper;

    private CustomUserPrincipal principal;

    @BeforeEach
    void setUp() {
        principal = new CustomUserPrincipal(1L, "testuser", "테스트", UserRole.ROOT, 1L);
    }

    private RequestPostProcessor auth() {
        var token = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_ROOT")));
        return authentication(token);
    }

    private CustomerResponse sampleCustomer() {
        return CustomerResponse.builder()
                .seq(1L).name("홍길동").phoneNumber("01012345678")
                .status("신규").createdDate(LocalDateTime.now()).build();
    }

    // ========== 조회 ==========

    @Nested
    class GetCustomer {

        @Test
        void 고객_단건_조회_성공() throws Exception {
            given(customerService.get(1L)).willReturn(sampleCustomer());

            mockMvc.perform(get("/api/customers/{seq}", 1L).with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.name").value("홍길동"));
        }

        @Test
        void 고객_목록_페이징_조회() throws Exception {
            given(customerQueryMapper.search(anyLong(), anyString(), any(), any(), anyInt(), anyInt()))
                    .willReturn(List.of(sampleCustomer()));
            given(customerQueryMapper.count(anyLong(), anyString(), any(), any()))
                    .willReturn(1);

            mockMvc.perform(get("/api/customers")
                            .param("page", "0").param("size", "20")
                            .with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        void 인증_없으면_401() throws Exception {
            mockMvc.perform(get("/api/customers/{seq}", 1L))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ========== 생성 ==========

    @Nested
    class Create {

        @Test
        void 고객_생성_성공() throws Exception {
            given(customerService.create(any(), anyLong())).willReturn(sampleCustomer());

            mockMvc.perform(post("/api/customers")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("name", "홍길동", "phoneNumber", "01012345678"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("고객 추가 완료"));
        }

        @Test
        void 고객_생성시_name_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/customers")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("name", "", "phoneNumber", "010"))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void 고객_생성시_phoneNumber_빈값이면_400() throws Exception {
            mockMvc.perform(post("/api/customers")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("name", "홍길동", "phoneNumber", ""))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        void 고객_생성시_지점_미선택이면_400() throws Exception {
            CustomUserPrincipal noBranch = new CustomUserPrincipal(1L, "test", "테스트", UserRole.ROOT, null);
            var token = new UsernamePasswordAuthenticationToken(
                    noBranch, null, List.of(new SimpleGrantedAuthority("ROLE_ROOT")));

            mockMvc.perform(post("/api/customers")
                            .with(authentication(token))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("name", "홍길동", "phoneNumber", "010"))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }
    }

    // ========== 수정 ==========

    @Nested
    class Update {

        @Test
        void 고객_수정_성공() throws Exception {
            given(customerService.update(anyLong(), any())).willReturn(sampleCustomer());

            mockMvc.perform(put("/api/customers/{seq}", 1L)
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("name", "수정", "phoneNumber", "010"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("고객 수정 완료"));
        }
    }

    // ========== 삭제 ==========

    @Nested
    class Delete {

        @Test
        void 고객_삭제_성공() throws Exception {
            willDoNothing().given(customerService).delete(1L);

            mockMvc.perform(delete("/api/customers/{seq}", 1L).with(auth()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("고객 삭제 완료"));
        }
    }

    // ========== 기타 액션 ==========

    @Nested
    class Actions {

        @Test
        void 이름_변경_성공() throws Exception {
            mockMvc.perform(post("/api/customers/update-name")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("customerSeq", 1, "name", "새이름"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("이름 변경 완료"));
        }

        @Test
        void 코멘트_업데이트_성공() throws Exception {
            given(customerService.updateComment(anyLong(), anyString()))
                    .willReturn(new com.culcom.dto.customer.CustomerCommentResponse("메모입니다"));

            mockMvc.perform(post("/api/customers/comment")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("customerSeq", 1, "comment", "메모입니다"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("코멘트 업데이트 완료"));
        }

        @Test
        void 전화상담안함_처리_성공() throws Exception {
            mockMvc.perform(post("/api/customers/mark-no-phone-interview")
                            .with(auth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(
                                    Map.of("customerSeq", 1))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("전화상안함으로 처리되었습니다"));
        }
    }
}
