package com.culcom.config;

import com.culcom.dto.ApiResponse;
import com.culcom.exception.InvalidDateFormatException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InvalidDateFormatException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidDateFormat(InvalidDateFormatException e) {
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("처리되지 않은 예외 발생: {}", e.getMessage(), e);
        return ResponseEntity.internalServerError()
                .body(ApiResponse.error(e.getMessage()));
    }
}
