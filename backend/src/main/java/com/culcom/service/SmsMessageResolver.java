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
     *
     * @param template      원본 메시지 템플릿
     * @param branch        지점 정보 (nullable)
     * @param customerName  고객명 (nullable)
     * @param customerPhone 고객 전화번호 (nullable)
     * @param interviewDate 예약 일시 (nullable)
     * @return 치환된 메시지
     */
    public String resolveWithContext(String template, Branch branch,
                                     String customerName, String customerPhone,
                                     String interviewDate) {
        Map<String, String> valueMap = buildValueMap(branch, customerName, customerPhone, interviewDate);

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

        return map;
    }
}
