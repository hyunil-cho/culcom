package com.culcom.dto.publicapi;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data @AllArgsConstructor
public class MemberSearchResponse {
    private List<MemberInfo> members;
}
