package com.culcom.controller.publicapi;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.entity.board.BoardAccount;
import com.culcom.entity.board.enums.BoardLoginType;
import com.culcom.entity.customer.Customer;
import com.culcom.service.BoardAccountService;
import com.culcom.service.BoardSessionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PublicBoardAuthController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class PublicBoardAuthControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean BoardAccountService boardAccountService;
    @MockBean BoardSessionService boardSessionService;

    private BoardAccount sampleAccount(Long seq, String email, String name, Customer customer) {
        BoardAccount account = BoardAccount.builder()
                .seq(seq)
                .email(email)
                .name(name)
                .phoneNumber("01012345678")
                .loginType(BoardLoginType.LOCAL)
                .customer(customer)
                .build();
        return account;
    }

    private Customer sampleCustomer(Long seq) {
        Customer c = new Customer();
        c.setSeq(seq);
        c.setName("홍길동");
        c.setPhoneNumber("01012345678");
        return c;
    }

    // ========== signup ==========

    @Test
    @DisplayName("회원가입_성공_세션쿠키_발급")
    void 회원가입_성공() throws Exception {
        Customer customer = sampleCustomer(100L);
        BoardAccount account = sampleAccount(10L, "foo@bar.com", "홍길동", customer);
        given(boardAccountService.signup(any())).willReturn(account);
        willDoNothing().given(boardSessionService).login(any(), anyLong(), anyString());

        Map<String, Object> body = Map.of(
                "email", "foo@bar.com",
                "password", "password123",
                "name", "홍길동",
                "phoneNumber", "01012345678"
        );

        mockMvc.perform(post("/api/public/board/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("회원가입 완료"))
                .andExpect(jsonPath("$.data.email").value("foo@bar.com"))
                .andExpect(jsonPath("$.data.name").value("홍길동"));

        verify(boardSessionService).login(any(), anyLong(), anyString());
    }

    @Test
    @DisplayName("회원가입_중복이메일_에러메시지_반환")
    void 회원가입_중복_이메일() throws Exception {
        willThrow(new IllegalArgumentException("이미 가입된 이메일입니다"))
                .given(boardAccountService).signup(any());

        Map<String, Object> body = Map.of(
                "email", "dup@bar.com",
                "password", "password123",
                "name", "홍길동",
                "phoneNumber", "01012345678"
        );

        mockMvc.perform(post("/api/public/board/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("이미 가입된 이메일입니다"));
    }

    @Test
    @DisplayName("회원가입_예상치못한_예외_처리")
    void 회원가입_예상치못한_예외() throws Exception {
        willThrow(new RuntimeException("DB 실패"))
                .given(boardAccountService).signup(any());

        Map<String, Object> body = Map.of(
                "email", "err@bar.com",
                "password", "password123",
                "name", "홍길동",
                "phoneNumber", "01012345678"
        );

        mockMvc.perform(post("/api/public/board/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("회원가입 처리 중 오류가 발생했습니다"));
    }

    @Test
    @DisplayName("회원가입_이메일_누락_400")
    void 회원가입_이메일_누락() throws Exception {
        Map<String, Object> body = Map.of(
                "password", "password123",
                "name", "홍길동",
                "phoneNumber", "01012345678"
        );

        mockMvc.perform(post("/api/public/board/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("회원가입_짧은_비밀번호_400")
    void 회원가입_짧은_비밀번호() throws Exception {
        Map<String, Object> body = Map.of(
                "email", "foo@bar.com",
                "password", "short",
                "name", "홍길동",
                "phoneNumber", "01012345678"
        );

        mockMvc.perform(post("/api/public/board/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("회원가입_잘못된_이메일_형식_400")
    void 회원가입_잘못된_이메일() throws Exception {
        Map<String, Object> body = Map.of(
                "email", "not-an-email",
                "password", "password123",
                "name", "홍길동",
                "phoneNumber", "01012345678"
        );

        mockMvc.perform(post("/api/public/board/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("회원가입_Customer_없으면_accountSeq로_로그인")
    void 회원가입_고객없음() throws Exception {
        // 고객 링크 실패 시 BoardAccount.seq 를 memberSeq 로 사용해야 함
        BoardAccount account = sampleAccount(77L, "foo@bar.com", "홍길동", null);
        given(boardAccountService.signup(any())).willReturn(account);

        Map<String, Object> body = Map.of(
                "email", "foo@bar.com",
                "password", "password123",
                "name", "홍길동",
                "phoneNumber", "01012345678"
        );

        mockMvc.perform(post("/api/public/board/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(boardSessionService).login(any(), org.mockito.ArgumentMatchers.eq(77L), anyString());
    }

    // ========== login ==========

    @Test
    @DisplayName("로그인_성공")
    void 로그인_성공() throws Exception {
        Customer customer = sampleCustomer(100L);
        BoardAccount account = sampleAccount(10L, "foo@bar.com", "홍길동", customer);
        given(boardAccountService.login(any())).willReturn(account);

        Map<String, Object> body = Map.of(
                "email", "foo@bar.com",
                "password", "password123"
        );

        mockMvc.perform(post("/api/public/board/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("로그인 성공"))
                .andExpect(jsonPath("$.data.email").value("foo@bar.com"));

        verify(boardSessionService).login(any(), org.mockito.ArgumentMatchers.eq(100L), anyString());
    }

    @Test
    @DisplayName("로그인_실패_비밀번호_불일치")
    void 로그인_실패_비밀번호_불일치() throws Exception {
        willThrow(new IllegalArgumentException("이메일 또는 비밀번호가 일치하지 않습니다"))
                .given(boardAccountService).login(any());

        Map<String, Object> body = Map.of(
                "email", "foo@bar.com",
                "password", "wrongpw1"
        );

        mockMvc.perform(post("/api/public/board/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("이메일 또는 비밀번호가 일치하지 않습니다"));
    }

    @Test
    @DisplayName("로그인_예상치못한_예외")
    void 로그인_예외() throws Exception {
        willThrow(new RuntimeException("DB 실패"))
                .given(boardAccountService).login(any());

        Map<String, Object> body = Map.of(
                "email", "foo@bar.com",
                "password", "password123"
        );

        mockMvc.perform(post("/api/public/board/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("로그인 처리 중 오류가 발생했습니다"));
    }

    @Test
    @DisplayName("로그인_이메일_누락_400")
    void 로그인_이메일_누락() throws Exception {
        Map<String, Object> body = Map.of("password", "password123");

        mockMvc.perform(post("/api/public/board/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }
}
