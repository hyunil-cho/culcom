package com.culcom.exception;

public class InvalidDateFormatException extends RuntimeException {

    public InvalidDateFormatException(String value) {
        super("날짜 형식이 올바르지 않습니다: " + value);
    }
}
