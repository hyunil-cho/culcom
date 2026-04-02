package com.culcom.dto.publicapi;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data @AllArgsConstructor
public class MemberInfo {
    private Long seq;
    private String name;
    private String phoneNumber;
    private Long branchSeq;
    private String branchName;
    private String level;
    private List<MembershipInfo> memberships;
    private List<ClassInfo> classes;
}
