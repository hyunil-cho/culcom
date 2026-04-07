package com.culcom.dto.complex.settings;

import com.culcom.entity.complex.settings.BankConfig;

public class BankConfigDto {

    public record Response(Long seq, String code, String label, Integer sortOrder, Boolean isActive) {
        public static Response from(BankConfig e) {
            return new Response(e.getSeq(), e.getCode(), e.getLabel(), e.getSortOrder(), e.getIsActive());
        }
    }

    public record CreateRequest(String code, String label, Integer sortOrder, Boolean isActive) {}

    public record UpdateRequest(String label, Integer sortOrder, Boolean isActive) {}
}
