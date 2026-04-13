package com.culcom.dto.complex.survey;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class OptionReorderRequest {

    private List<OptionReorderItem> items;

    @Getter
    @Setter
    public static class OptionReorderItem {
        private Long seq;
        private Integer sortOrder;
    }
}
