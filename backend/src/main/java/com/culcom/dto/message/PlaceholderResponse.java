package com.culcom.dto.message;

import com.culcom.entity.enums.PlaceholderCategory;
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
    private PlaceholderCategory category;

    public static PlaceholderResponse from(Placeholder entity) {
        return PlaceholderResponse.builder()
                .seq(entity.getSeq())
                .name(entity.getName())
                .comment(entity.getComment())
                .examples(entity.getExamples())
                .value(entity.getValue())
                .category(entity.getCategory())
                .build();
    }
}
