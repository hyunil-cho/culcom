package com.culcom.exception;

import org.springframework.security.access.AccessDeniedException;

/**
 * 인증은 되었으나 해당 리소스에 접근 권한이 없을 때 사용 (HTTP 403).
 */
public class ForbiddenException extends AccessDeniedException {
    public ForbiddenException(String message) {
        super(message);
    }
}
