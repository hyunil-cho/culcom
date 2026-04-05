package com.culcom.service.external;

import com.culcom.config.SmsProperties;
import com.culcom.dto.integration.SmsSendResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@Slf4j
@Component
@Profile("!test")
@RequiredArgsConstructor
public class SmsClientImpl implements SmsClient {

    private final SmsProperties smsProperties;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final Map<String, String> RESPONSE_CODES = Map.ofEntries(
            Map.entry("0000", "전송성공"),
            Map.entry("0001", "접속에러"), Map.entry("0002", "인증에러"),
            Map.entry("0003", "잔여콜수 없음"), Map.entry("0004", "메시지 형식에러"),
            Map.entry("0005", "콜백번호 에러"), Map.entry("0006", "수신번호 개수 에러"),
            Map.entry("0008", "잔여콜수 부족"), Map.entry("0009", "전송실패"),
            Map.entry("0012", "메시지 길이오류(2000바이트초과)"),
            Map.entry("0030", "발신번호 미등록"), Map.entry("0033", "발신번호 형식에러"),
            Map.entry("9999", "요금미납")
    );

    @Override
    public SmsSendResponse send(String accountId, String password,
                                String senderPhone, String receiverPhone,
                                String message, String subject) {
        senderPhone = normalizePhone(senderPhone);
        receiverPhone = normalizePhone(receiverPhone);

        byte[] messageBytes = message.getBytes(StandardCharsets.UTF_8);
        int byteLength = messageBytes.length;
        boolean isLms = byteLength > smsProperties.getMaxSmsBytes();

        if (isLms && byteLength > 2000) {
            return SmsSendResponse.builder().success(false)
                    .message("LMS 메시지가 너무 깁니다 (최대 2000바이트, 현재 " + byteLength + "바이트)").build();
        }

        String endpoint = smsProperties.getApiBaseUrl()
                + (isLms ? smsProperties.getLmsEndpoint() : smsProperties.getSmsEndpoint());
        String msgType = isLms ? "LMS" : "SMS";

        log.info("{} 발송 - 수신: {}, 발신: {}, {}바이트", msgType, receiverPhone, senderPhone, byteLength);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("remote_id", accountId);
        form.add("remote_pass", password);
        form.add("remote_num", "1");
        form.add("remote_phone", receiverPhone);
        form.add("remote_callback", senderPhone);
        form.add("remote_msg", message);
        if (isLms) form.add("remote_subject", subject != null && !subject.isBlank() ? subject : "안내 메시지");

        String responseText = postForm(endpoint, form);
        return parseResponse(responseText, msgType);
    }

    @Override
    public int[] checkRemainingCount(String accountId, String password) {
        String endpoint = smsProperties.getApiBaseUrl() + smsProperties.getCheckEndpoint();
        int smsCount = checkByType(endpoint, accountId, password, "sms");
        int lmsCount = checkByType(endpoint, accountId, password, "lms");
        log.info("잔여건수 - SMS: {}, LMS: {}", smsCount, lmsCount);
        return new int[]{smsCount, lmsCount};
    }

    private String normalizePhone(String phone) {
        if (phone == null) return "";
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.startsWith("82") && digits.length() > 2) digits = "0" + digits.substring(2);
        return digits;
    }

    private String postForm(String endpoint, MultiValueMap<String, String> form) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    endpoint, HttpMethod.POST, new HttpEntity<>(form, headers), String.class);
            return response.getBody() != null ? response.getBody().trim() : "";
        } catch (Exception e) {
            log.error("SMS API 요청 오류: {}", e.getMessage());
            return "";
        }
    }

    private SmsSendResponse parseResponse(String text, String msgType) {
        if (text.isBlank()) return SmsSendResponse.builder().success(false).message("SMS API 응답 없음").msgType(msgType).build();
        String[] parts = text.split("\\|");
        if (parts.length < 4) return SmsSendResponse.builder().success(false).message("응답 형식 오류: " + text).msgType(msgType).build();
        String code = parts[0];
        boolean success = "0000".equals(code);
        String message = RESPONSE_CODES.getOrDefault(code, "알 수 없는 오류");
        if (!success) message += " (Code: " + code + ")";
        return SmsSendResponse.builder().success(success).message(message).code(code).nums(parts[3]).cols(parts[2]).msgType(msgType).build();
    }

    private int checkByType(String endpoint, String accountId, String password, String type) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("remote_id", accountId);
        form.add("remote_pass", password);
        form.add("remote_request", type);
        String text = postForm(endpoint, form);
        if (text.isBlank()) throw new IllegalArgumentException("마이문자 API 응답 없음");
        String[] parts = text.split("\\|");
        if (parts.length >= 3 && "0000".equals(parts[0].trim())) {
            try { return Integer.parseInt(parts[2].trim()); } catch (NumberFormatException ignored) {}
        }
        throw new IllegalArgumentException("마이문자 " + type.toUpperCase() + " 조회 실패: " + text);
    }
}
