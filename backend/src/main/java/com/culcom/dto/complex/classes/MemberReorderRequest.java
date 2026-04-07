package com.culcom.dto.complex.classes;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class MemberReorderRequest {
    private Long classSeq;
    private List<MemberOrder> memberOrders;

    @Getter
    @Setter
    public static class MemberOrder {
        private Long memberSeq;
        private Integer sortOrder;
    }
}
