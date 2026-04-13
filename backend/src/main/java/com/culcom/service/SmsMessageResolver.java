package com.culcom.service;

import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * SMS 템플릿 메시지의 플레이스홀더를 실제 값으로 치환하는 컴포넌트.
 */
@Component
public class SmsMessageResolver {

    /**
     * 템플릿 내 플레이스홀더를 치환한다.
     *
     * @param template     원본 메시지 템플릿 (예: "{{고객명}}님 안녕하세요")
     * @param placeholders 플레이스홀더 이름 → 값 매핑 (예: {"{{고객명}}" → "홍길동"})
     * @return 치환된 메시지
     */
    public String resolve(String template, Map<String, String> placeholders) {
        String result = template;
        for (Map.Entry<String, String> entry : placeholders.entrySet()) {
            String value = entry.getValue() != null ? entry.getValue() : "";
            result = result.replace(entry.getKey(), value);
        }
        return result;
    }
}
