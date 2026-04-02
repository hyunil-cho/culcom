package com.culcom.controller.external;

import com.culcom.dto.ApiResponse;
import com.culcom.dto.external.CalendarEventRequest;
import com.culcom.dto.external.CalendarEventResponse;
import com.culcom.dto.integration.SmsSendRequest;
import com.culcom.dto.integration.SmsSendResponse;
import com.culcom.entity.Branch;
import com.culcom.repository.BranchRepository;
import com.culcom.service.AuthService;
import com.culcom.service.SmsService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@Slf4j
@RestController
@RequestMapping("/api/external")
@RequiredArgsConstructor
public class ExternalServiceController {

    private final SmsService smsService;
    private final AuthService authService;
    private final BranchRepository branchRepository;

    // ── SMS ──

    /**
     * SMS/LMS 발송.
     * 메시지 바이트 길이에 따라 SMS(≤90) 또는 LMS(91~2000) 자동 결정.
     */
    @PostMapping("/sms/send")
    public ResponseEntity<ApiResponse<SmsSendResponse>> sendSms(
            @Valid @RequestBody SmsSendRequest request, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);

        log.info("SMS 발송 요청 - 지점: {}, 수신: {}, 발신: {}", branchSeq, request.getReceiverPhone(), request.getSenderPhone());

        SmsSendResponse result = smsService.sendByBranch(
                branchSeq,
                request.getSenderPhone(),
                request.getReceiverPhone(),
                request.getMessage(),
                request.getSubject()
        );

        if (!result.isSuccess()) {
            log.warn("SMS 발송 실패 - {}", result.getMessage());
            return ResponseEntity.ok(ApiResponse.error(result.getMessage()));
        }

        smsService.updateRemainingCount(branchSeq, result.getCols(), result.getMsgType());

        log.info("SMS 발송 성공 - Type: {}, 잔여: {}", result.getMsgType(), result.getCols());
        return ResponseEntity.ok(ApiResponse.ok(result.getMessage(), result));
    }

    // ── Google Calendar ──

    /**
     * 구글 캘린더 이벤트 URL 생성.
     * OAuth 없이 "Add to Calendar" URL을 반환하여 클라이언트가 새 탭으로 연다.
     */
    @PostMapping("/calendar/create-event")
    public ResponseEntity<ApiResponse<CalendarEventResponse>> createCalendarEvent(
            @Valid @RequestBody CalendarEventRequest request, HttpSession session) {
        Long branchSeq = authService.getSessionBranchSeq(session);

        // 인터뷰 일시 파싱 (yyyy-MM-dd HH:mm:ss, yyyy-MM-dd HH:mm, yyyy-MM-ddTHH:mm 순으로 시도)
        LocalDateTime interviewTime = null;
        String[] patterns = {"yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd HH:mm", "yyyy-MM-dd'T'HH:mm"};
        for (String pattern : patterns) {
            try {
                interviewTime = LocalDateTime.parse(request.getInterviewDate(),
                        DateTimeFormatter.ofPattern(pattern));
                break;
            } catch (DateTimeParseException ignored) {
            }
        }
        if (interviewTime == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("날짜 형식이 올바르지 않습니다. (예: 2026-04-02 14:30)"));
        }

        int duration = request.getDuration() != null ? request.getDuration() : 60;

        // UTC 변환
        var startUtc = interviewTime.atZone(ZoneId.of("Asia/Seoul")).withZoneSameInstant(ZoneId.of("UTC"));
        var endUtc = startUtc.plusMinutes(duration);
        String startStr = startUtc.format(DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'"));
        String endStr = endUtc.format(DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'"));

        // 타이틀: (일 참석) CALLER+통화횟수 고객명 전화번호
        String day = LocalDate.now().format(DateTimeFormatter.ofPattern("dd"));
        String callerInfo = "";
        if (request.getCaller() != null && !request.getCaller().isBlank()) {
            callerInfo = request.getCaller() + (request.getCallCount() != null ? request.getCallCount() : 0);
        }
        String title = String.format("(%s 참석) %s %s %s",
                day, callerInfo, request.getCustomerName(), request.getPhoneNumber()).trim();

        // 설명
        StringBuilder desc = new StringBuilder();
        if (request.getCommercialName() != null && !request.getCommercialName().isBlank()) {
            desc.append("광고명: ").append(request.getCommercialName());
        }
        if (request.getAdSource() != null && !request.getAdSource().isBlank()) {
            if (!desc.isEmpty()) desc.append("\n");
            desc.append("광고 출처: ").append(request.getAdSource());
        }
        if (request.getComment() != null && !request.getComment().isBlank()) {
            if (!desc.isEmpty()) desc.append("\n\n");
            desc.append(request.getComment());
        }

        // 지점 alias를 location으로
        String location = "";
        if (branchSeq != null) {
            location = branchRepository.findById(branchSeq)
                    .map(Branch::getAlias)
                    .orElse("");
        }

        // URL 생성
        String calendarUrl = String.format(
                "https://calendar.google.com/calendar/render?action=TEMPLATE&text=%s&dates=%s/%s&details=%s&location=%s",
                encode(title), startStr, endStr, encode(desc.toString()), encode(location)
        );

        log.info("캘린더 URL 생성 - 고객: {}, 일시: {}", request.getCustomerName(), request.getInterviewDate());

        return ResponseEntity.ok(ApiResponse.ok("캘린더 이벤트가 생성되었습니다",
                CalendarEventResponse.builder().link(calendarUrl).build()));
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
