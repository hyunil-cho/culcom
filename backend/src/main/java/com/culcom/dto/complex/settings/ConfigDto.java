package com.culcom.dto.complex.settings;

import com.culcom.entity.complex.settings.Configurable;
import com.culcom.entity.complex.settings.PaymentMethodConfig;

public class ConfigDto {

    public record Response(Long seq, String code, Boolean isActive, Boolean locked) {
        public static Response from(Configurable e) {
            boolean locked = (e instanceof PaymentMethodConfig p) && Boolean.TRUE.equals(p.getLocked());
            return new Response(e.getSeq(), e.getCode(), e.getIsActive(), locked);
        }
    }

    public record CreateRequest(String code, Boolean isActive) {}

    public record UpdateRequest(Boolean isActive) {}
}
