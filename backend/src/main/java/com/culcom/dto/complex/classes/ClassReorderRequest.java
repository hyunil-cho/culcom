package com.culcom.dto.complex.classes;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ClassReorderRequest {
    private List<ClassOrder> classOrders;

    @Getter
    @Setter
    public static class ClassOrder {
        private Long id;
        private Integer sortOrder;
    }
}
