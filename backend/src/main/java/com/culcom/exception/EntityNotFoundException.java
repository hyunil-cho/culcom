package com.culcom.exception;

public class EntityNotFoundException extends RuntimeException {

    public EntityNotFoundException(String entity) {
        super(entity + "을(를) 찾을 수 없습니다.");
    }
}
