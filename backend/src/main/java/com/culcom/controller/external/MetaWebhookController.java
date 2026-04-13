package com.culcom.controller.external;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/external/meta")
public class MetaWebhookController {

    @Value("${meta.webhook.verify-token}")
    private String verifyToken;

    /**
     * Meta Webhooks 구독 인증 (Verification Request).
     * Meta가 GET 요청으로 hub.mode, hub.verify_token, hub.challenge를 보내면,
     * verify_token이 일치할 때 hub.challenge 값을 그대로 반환한다.
     */
    @GetMapping
    public ResponseEntity<String> verify(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String token,
            @RequestParam("hub.challenge") String challenge) {

        if ("subscribe".equals(mode) && verifyToken.equals(token)) {
            log.info("Meta Webhook 인증 성공");
            return ResponseEntity.ok(challenge);
        }

        log.warn("Meta Webhook 인증 실패 - mode: {}, token 일치: {}", mode, verifyToken.equals(token));
        return ResponseEntity.status(403).body("Verification failed");
    }

    /**
     * Meta Webhooks 이벤트 수신 (Event Notification).
     * Meta가 POST로 변경 이벤트 JSON을 전송하면 200 OK를 반환한다.
     */
    @PostMapping
    public ResponseEntity<String> receiveEvent(@RequestBody Map<String, Object> payload) {
        log.info("Meta Webhook 이벤트 수신: {}", payload);
        return ResponseEntity.ok("EVENT_RECEIVED");
    }
}