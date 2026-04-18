package com.culcom.service;

import com.culcom.entity.branch.Branch;
import com.culcom.entity.message.Placeholder;
import com.culcom.repository.PlaceholderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * SMS 템플릿 메시지의 플레이스홀더를 실제 값으로 치환하는 컴포넌트.
 */
@Component
@RequiredArgsConstructor
public class SmsMessageResolver {

    private final PlaceholderRepository placeholderRepository;

    /**
     * DB 플레이스홀더 정의와 컨텍스트 값을 기반으로 템플릿을 치환한다.
     * 값이 없는 플레이스홀더는 빈 문자열로 치환된다.
     */
    public String resolveWithContext(String template, Branch branch,
                                     String customerName, String customerPhone,
                                     String interviewDate) {
        return resolveWithContext(template, branch, customerName, customerPhone, interviewDate, Map.of());
    }

    /**
     * extraContext는 고정 컨텍스트에 덮어쓰이거나 추가 키를 제공한다.
     * 예: {@code {action.reject_reason}}, {@code {action.event_type}}.
     */
    public String resolveWithContext(String template, Branch branch,
                                     String customerName, String customerPhone,
                                     String interviewDate,
                                     Map<String, String> extraContext) {
        Map<String, String> valueMap = buildValueMap(branch, customerName, customerPhone, interviewDate);
        if (extraContext != null) {
            for (Map.Entry<String, String> e : extraContext.entrySet()) {
                valueMap.put(e.getKey(), e.getValue() != null ? e.getValue() : "");
            }
        }

        List<Placeholder> placeholders = placeholderRepository.findAll();
        String result = template;
        for (Placeholder ph : placeholders) {
            if (ph.getName() == null || ph.getValue() == null) continue;
            String replacement = valueMap.getOrDefault(ph.getValue(), "");
            result = result.replace(ph.getName(), replacement);
        }
        return result;
    }

    private Map<String, String> buildValueMap(Branch branch, String customerName,
                                               String customerPhone, String interviewDate) {
        LocalDateTime now = LocalDateTime.now();
        Map<String, String> map = new HashMap<>();

        map.put("{customer.name}", customerName != null ? customerName : "");
        map.put("{customer.phone_number}", customerPhone != null ? customerPhone : "");
        map.put("{branch.name}", branch != null && branch.getBranchName() != null ? branch.getBranchName() : "");
        map.put("{branch.address}", branch != null && branch.getAddress() != null ? branch.getAddress() : "");
        map.put("{branch.manager}", branch != null && branch.getBranchManager() != null ? branch.getBranchManager() : "");
        map.put("{branch.directions}", branch != null && branch.getDirections() != null ? branch.getDirections() : "");
        map.put("{system.current_date}", now.format(DateTimeFormatter.ISO_LOCAL_DATE));
        map.put("{system.current_time}", now.format(DateTimeFormatter.ofPattern("HH:mm")));
        map.put("{system.current_datetime}", now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
        map.put("{reservation.interview_date}", interviewDate != null ? interviewDate : "");
        map.put("{reservation.interview_datetime}", interviewDate != null ? interviewDate : "");

        // 액션 플레이스홀더 기본값(빈 문자열). 호출부가 extraContext 로 덮어쓴다.
        map.put("{action.event_type}", "");
        map.put("{action.reject_reason}", "");
        map.put("{action.approve_comment}", "");

        return map;
    }
}
