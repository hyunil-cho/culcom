package com.culcom.config;

import com.culcom.dto.ApiResponse;
import com.culcom.exception.EntityNotFoundException;
import com.culcom.exception.ForbiddenException;
import lombok.extern.slf4j.Slf4j;
import org.mybatis.spring.MyBatisSystemException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── 400 Bad Request ──

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException e) {
        log.info("잘못된 요청 값: {}", e.getMessage());
        return badRequest(e.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(IllegalStateException e) {
        log.info("잘못된 상태 값: {}", e.getMessage());
        return badRequest(e.getMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleMessageNotReadable(HttpMessageNotReadableException e) {
        log.info("요청 본문 파싱 실패: {}", e.getMessage());
        return badRequest("요청 형식이 올바르지 않습니다.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .findFirst()
                .orElse("입력값 검증에 실패했습니다.");
        log.info("입력값 검증 실패: {}", message);
        return badRequest(message);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingParam(MissingServletRequestParameterException e) {
        log.info("필수 파라미터 누락: {}", e.getParameterName());
        return badRequest("필수 파라미터가 누락되었습니다: " + e.getParameterName());
    }

    // ── 401 Unauthorized ──

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(
            org.springframework.security.access.AccessDeniedException e) {
        log.info("접근 거부: {}", e.getMessage());
        return respond(HttpStatus.UNAUTHORIZED, e.getMessage());
    }

    // ── 403 Forbidden ──

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiResponse<Void>> handleForbidden(ForbiddenException e) {
        log.info("권한 부족: {}", e.getMessage());
        return respond(HttpStatus.FORBIDDEN, e.getMessage());
    }

    // ── 404 Not Found ──

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleEntityNotFound(EntityNotFoundException e) {
        log.info("엔티티 조회 실패: {}", e.getMessage());
        return respond(HttpStatus.NOT_FOUND, e.getMessage());
    }

    // ── 405 Method Not Allowed ──

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException e) {
        log.info("지원하지 않는 HTTP 메서드: {}", e.getMethod());
        return respond(HttpStatus.METHOD_NOT_ALLOWED, "지원하지 않는 요청 방식입니다: " + e.getMethod());
    }

    // ── 409 Conflict ──

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(DataIntegrityViolationException e) {
        if (e.getCause() instanceof org.hibernate.exception.ConstraintViolationException cve) {
            log.warn("유니크 제약 조건 위반: {}", cve.getMessage());
            return respond(HttpStatus.CONFLICT, "이미 존재하는 데이터입니다: " + cve.getMessage());
        }
        log.warn("데이터 무결성 위반: {}", e.getMostSpecificCause().getMessage());
        return respond(HttpStatus.CONFLICT, "데이터 제약 조건에 위배됩니다. 중복되거나 참조 중인 데이터가 있는지 확인해주세요.");
    }

    // ── 500 Internal Server Error ──

    @ExceptionHandler({BadSqlGrammarException.class, MyBatisSystemException.class})
    public ResponseEntity<ApiResponse<Void>> handleMyBatisException(Exception e) {
        log.error("MyBatis 쿼리 실행 실패: {}", e.getMessage(), e);
        return internalError("데이터 조회 중 오류가 발생했습니다.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("처리되지 않은 예외 발생: {}", e.getMessage(), e);
        return internalError("서버 내부 오류가 발생했습니다.");
    }

    // ── 헬퍼 ──

    private ResponseEntity<ApiResponse<Void>> badRequest(String message) {
        return ResponseEntity.badRequest().body(ApiResponse.error(message));
    }

    private ResponseEntity<ApiResponse<Void>> internalError(String message) {
        return ResponseEntity.internalServerError().body(ApiResponse.error(message));
    }

    private ResponseEntity<ApiResponse<Void>> respond(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(ApiResponse.error(message));
    }
}
