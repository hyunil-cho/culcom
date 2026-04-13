package com.culcom.dto.complex.settings;

import com.culcom.entity.complex.settings.Configurable;

public class ConfigDto {

    public record Response(Long seq, String code, Boolean isActive) {
        public static Response from(Configurable e) {
            return new Response(e.getSeq(), e.getCode(), e.getIsActive());
        }
    }

    public record CreateRequest(String code, Boolean isActive) {}

    public record UpdateRequest(Boolean isActive) {}
}
