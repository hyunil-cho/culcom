package com.culcom.dto.complex.member;

import com.culcom.entity.complex.member.ComplexMember;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplexMemberResponse {
    private Long seq;
    private String name;
    private String phoneNumber;
    private String level;
    private String language;
    private String info;
    private String chartNumber;
    private String comment;
    private LocalDateTime joinDate;
    private String signupChannel;
    private String interviewer;
    private LocalDateTime createdDate;
    private LocalDateTime lastUpdateDate;

    @Setter
    private List<String> attendanceHistory;

    public static ComplexMemberResponse from(ComplexMember entity) {
        return ComplexMemberResponse.builder()
                .seq(entity.getSeq())
                .name(entity.getName())
                .phoneNumber(entity.getPhoneNumber())
                .level(entity.getMetaData() != null ? entity.getMetaData().getLevel() : null)
                .language(entity.getMetaData() != null ? entity.getMetaData().getLanguage() : null)
                .info(entity.getInfo())
                .chartNumber(entity.getChartNumber())
                .comment(entity.getComment())
                .joinDate(entity.getJoinDate())
                .signupChannel(entity.getMetaData() != null ? entity.getMetaData().getSignupChannel() : null)
                .interviewer(entity.getInterviewer())
                .createdDate(entity.getCreatedDate())
                .lastUpdateDate(entity.getLastUpdateDate())
                .build();
    }
}
