package com.culcom.dto.complex.member;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ComplexMemberRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String phoneNumber;
    private String info;
    private String comment;

    /**
     * 회원 생성에 활용된 설문 제출 seq (옵션).
     * 지정 시 해당 설문 제출은 {@code referenced=true}로 표시되어 이후 리스트에서 숨겨진다.
     */
    private Long surveySubmissionSeq;
}
