package com.culcom.dto.consent;

import com.culcom.entity.consent.ConsentItem;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ConsentItemResponse {
    private Long seq;
    private String title;
    private String content;
    private Boolean required;
    private String category;
    private Integer version;
    private LocalDateTime createdDate;
    private LocalDateTime lastUpdateDate;

    public static ConsentItemResponse from(ConsentItem entity) {
        return ConsentItemResponse.builder()
                .seq(entity.getSeq())
                .title(entity.getTitle())
                .content(entity.getContent())
                .required(entity.getRequired())
                .category(entity.getCategory())
                .version(entity.getVersion())
                .createdDate(entity.getCreatedDate())
                .lastUpdateDate(entity.getLastUpdateDate())
                .build();
    }
}
