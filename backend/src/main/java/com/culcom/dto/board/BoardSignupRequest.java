package com.culcom.dto.board;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter @Setter
public class BoardSignupRequest {

    @NotBlank(message = "이메일을 입력해주세요")
    @Email(message = "올바른 이메일 형식이 아닙니다")
    private String email;

    @NotBlank(message = "비밀번호를 입력해주세요")
    @Size(min = 8, max = 100, message = "비밀번호는 8~100자로 입력해주세요")
    private String password;

    @NotBlank(message = "이름을 입력해주세요")
    private String name;

    @NotBlank(message = "전화번호를 입력해주세요")
    private String phoneNumber;

    /** 회원가입 단계에서 받은 약관 동의 내역 */
    private List<ConsentAgreement> consents = new ArrayList<>();

    @Getter
    @Setter
    public static class ConsentAgreement {
        @NotNull
        private Long consentItemSeq;
        @NotNull
        private Boolean agreed;
    }
}
