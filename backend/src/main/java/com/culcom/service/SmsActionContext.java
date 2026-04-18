package com.culcom.service;

import com.culcom.entity.enums.RequestStatus;

import java.util.HashMap;
import java.util.Map;

/**
 * 연기/환불(승인/반려) 흐름에서 관리자 메시지를 SMS 플레이스홀더 컨텍스트로 매핑한다.
 *
 *  - 승인 → {@code {action.approve_comment}}
 *  - 반려 → {@code {action.reject_reason}}
 *
 * 리졸버가 {@code {action.event_type}} 은 SmsService 에서 자동으로 주입하므로 여기선 다루지 않는다.
 */
final class SmsActionContext {

    private SmsActionContext() {}

    static Map<String, String> of(RequestStatus status, String adminMessage) {
        Map<String, String> ctx = new HashMap<>();
        if (adminMessage == null || adminMessage.isBlank()) {
            return ctx;
        }
        if (status == RequestStatus.승인) {
            ctx.put("{action.approve_comment}", adminMessage);
        } else if (status == RequestStatus.반려) {
            ctx.put("{action.reject_reason}", adminMessage);
        }
        return ctx;
    }

    /**
     * 양도용 오버로드. TransferStatus.확인 → approve_comment, 거절 → reject_reason.
     */
    static Map<String, String> ofTransfer(com.culcom.entity.enums.TransferStatus status, String adminMessage) {
        Map<String, String> ctx = new HashMap<>();
        if (adminMessage == null || adminMessage.isBlank()) {
            return ctx;
        }
        if (status == com.culcom.entity.enums.TransferStatus.확인) {
            ctx.put("{action.approve_comment}", adminMessage);
        } else if (status == com.culcom.entity.enums.TransferStatus.거절) {
            ctx.put("{action.reject_reason}", adminMessage);
        }
        return ctx;
    }
}
