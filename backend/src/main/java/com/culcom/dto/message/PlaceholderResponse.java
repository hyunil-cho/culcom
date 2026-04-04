package com.culcom.dto.message;

import com.culcom.entity.message.Placeholder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class PlaceholderResponse {

    private Long seq;
    private String name;
    private String comment;
    private String examples;
    private String value;

    public static PlaceholderResponse from(Placeholder entity) {
        return PlaceholderResponse.builder()
                .seq(entity.getSeq())
                .name(entity.getName())
                .comment(entity.getComment())
                .examples(entity.getExamples())
                .value(entity.getValue())
                .build();
    }
}
