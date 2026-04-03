package com.culcom.dto.complex;

import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
public class QuestionReorderRequest {
    private List<QuestionReorderItem> items;

    @Getter
    @Setter
    public static class QuestionReorderItem {
        private Long seq;
        private Integer sortOrder;
        private String newQuestionKey;
    }
}
