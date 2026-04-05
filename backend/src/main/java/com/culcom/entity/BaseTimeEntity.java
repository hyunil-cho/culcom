package com.culcom.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 생성일/수정일 공통 매핑 슈퍼클래스.
 * 모든 엔티티가 상속하여 createdDate, lastUpdateDate를 자동 관리한다.
 */
@MappedSuperclass
@Getter @Setter
public abstract class BaseTimeEntity {

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @Column
    private LocalDateTime lastUpdateDate;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        lastUpdateDate = LocalDateTime.now();
    }
}
