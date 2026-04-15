package com.culcom.controller.board;

import com.culcom.entity.board.BoardAccount;
import com.culcom.entity.board.enums.BoardLoginType;
import com.culcom.entity.customer.Customer;
import com.culcom.entity.enums.CustomerStatus;
import com.culcom.repository.CustomerRepository;
import com.culcom.repository.board.BoardAccountRepository;
import com.culcom.service.BoardSessionService;
import com.culcom.service.external.KakaoOAuthClient;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 보드 마이페이지에서 회원탈퇴 (/api/public/board/withdraw) 호출 시
 * Customer 및 연결된 BoardAccount 가 모두 삭제됨을 검증한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class BoardMypageWithdrawTest {

    @Autowired MockMvc mockMvc;
    @Autowired CustomerRepository customerRepository;
    @Autowired BoardAccountRepository boardAccountRepository;
    @Autowired BoardSessionService boardSessionService;

    @SpyBean KakaoOAuthClient kakaoOAuthClient;

    @Test
    @DisplayName("일반 가입 회원이 탈퇴하면 Customer 및 BoardAccount 가 함께 삭제된다")
    void 일반회원_탈퇴_시_Customer_삭제() throws Exception {
        Customer customer = customerRepository.save(Customer.builder()
                .name("로컬유저")
                .phoneNumber("01077770000")
                .adSource("게시판")
                .status(CustomerStatus.신규)
                .build());

        BoardAccount account = boardAccountRepository.save(BoardAccount.builder()
                .email("withdraw-local@example.com")
                .passwordHash("hashed")
                .name("로컬유저")
                .phoneNumber("01077770000")
                .loginType(BoardLoginType.LOCAL)
                .customer(customer)
                .build());

        Cookie sessionCookie = issueSessionCookie(customer.getSeq(), customer.getName());

        mockMvc.perform(post("/api/public/board/withdraw").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertThat(customerRepository.findById(customer.getSeq())).isEmpty();
        assertThat(boardAccountRepository.findById(account.getSeq())).isEmpty();
        verify(kakaoOAuthClient, never()).unlinkUser(any());
    }

    @Test
    @DisplayName("카카오 가입 회원이 탈퇴하면 Customer 가 삭제되고 unlink API 가 호출된다")
    void 카카오회원_탈퇴_시_Customer_삭제_및_unlink() throws Exception {
        Customer customer = customerRepository.save(Customer.builder()
                .name("카카오유저")
                .phoneNumber("01088880000")
                .kakaoId(77777L)
                .adSource("카카오")
                .status(CustomerStatus.신규)
                .build());

        Cookie sessionCookie = issueSessionCookie(customer.getSeq(), customer.getName());
        clearInvocations(kakaoOAuthClient);

        mockMvc.perform(post("/api/public/board/withdraw").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertThat(customerRepository.findById(customer.getSeq())).isEmpty();
        verify(kakaoOAuthClient, times(1)).unlinkUser(77777L);
    }

    private Cookie issueSessionCookie(Long memberSeq, String memberName) {
        MockHttpServletResponse response = new MockHttpServletResponse();
        boardSessionService.login(response, memberSeq, memberName);
        Cookie cookie = response.getCookie("board_session");
        assertThat(cookie).isNotNull();
        return cookie;
    }
}
