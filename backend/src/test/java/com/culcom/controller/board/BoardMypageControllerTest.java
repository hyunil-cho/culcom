package com.culcom.controller.board;

import com.culcom.config.GlobalExceptionHandler;
import com.culcom.config.SecurityConfig;
import com.culcom.entity.customer.Customer;
import com.culcom.service.BoardSessionService;
import com.culcom.service.BoardSessionService.BoardSessionData;
import com.culcom.service.CustomerService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BoardMypageController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
class BoardMypageControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean CustomerService customerService;
    @MockBean BoardSessionService boardSessionService;

    private BoardSessionData loggedIn(long seq, String name) {
        BoardSessionData data = Mockito.mock(BoardSessionData.class);
        given(data.isLoggedIn()).willReturn(true);
        given(data.getMemberSeq()).willReturn(seq);
        given(data.getMemberName()).willReturn(name);
        return data;
    }

    private BoardSessionData loggedOut() {
        BoardSessionData data = Mockito.mock(BoardSessionData.class);
        given(data.isLoggedIn()).willReturn(false);
        return data;
    }

    // ========== GET /mypage ==========

    @Test
    @DisplayName("마이페이지_로그인_안되어있으면_에러")
    void 마이페이지_비로그인() throws Exception {
        BoardSessionData session = loggedOut();
        given(boardSessionService.getSession(any(), any())).willReturn(session);

        mockMvc.perform(get("/api/public/board/mypage"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("로그인이 필요합니다"));

        verify(customerService, never()).findById(any());
    }

    @Test
    @DisplayName("마이페이지_Customer_없으면_에러")
    void 마이페이지_고객없음() throws Exception {
        BoardSessionData session = loggedIn(42L, "홍길동");
        given(boardSessionService.getSession(any(), any())).willReturn(session);
        given(customerService.findById(42L)).willReturn(null);

        mockMvc.perform(get("/api/public/board/mypage"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("회원 정보를 찾을 수 없습니다"));
    }

    @Test
    @DisplayName("마이페이지_조회_성공")
    void 마이페이지_성공() throws Exception {
        BoardSessionData session = loggedIn(42L, "홍길동");
        given(boardSessionService.getSession(any(), any())).willReturn(session);
        Customer customer = new Customer();
        customer.setSeq(42L);
        customer.setName("홍길동");
        customer.setPhoneNumber("01012345678");
        given(customerService.findById(42L)).willReturn(customer);

        mockMvc.perform(get("/api/public/board/mypage"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("홍길동"))
                .andExpect(jsonPath("$.data.phoneNumber").value("01012345678"));
    }

    // ========== POST /withdraw ==========

    @Test
    @DisplayName("탈퇴_비로그인이면_에러")
    void 탈퇴_비로그인() throws Exception {
        BoardSessionData session = loggedOut();
        given(boardSessionService.getSession(any(), any())).willReturn(session);

        mockMvc.perform(post("/api/public/board/withdraw"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("로그인이 필요합니다"));

        verify(customerService, never()).delete(any());
    }

    @Test
    @DisplayName("탈퇴_Customer_없으면_에러")
    void 탈퇴_고객없음() throws Exception {
        BoardSessionData session = loggedIn(42L, "홍길동");
        given(boardSessionService.getSession(any(), any())).willReturn(session);
        given(customerService.findById(42L)).willReturn(null);

        mockMvc.perform(post("/api/public/board/withdraw"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("회원 정보를 찾을 수 없습니다"));

        verify(customerService, never()).delete(any());
    }

    @Test
    @DisplayName("탈퇴_성공시_Customer_삭제_및_세션_로그아웃")
    void 탈퇴_성공() throws Exception {
        BoardSessionData session = loggedIn(42L, "홍길동");
        given(boardSessionService.getSession(any(), any())).willReturn(session);
        Customer customer = new Customer();
        customer.setSeq(42L);
        customer.setName("홍길동");
        given(customerService.findById(42L)).willReturn(customer);

        mockMvc.perform(post("/api/public/board/withdraw"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("회원탈퇴가 완료되었습니다"));

        verify(customerService).delete(eq(42L));
        verify(boardSessionService).logout(any());
    }
}
