package com.culcom.entity.complex.settings;

/**
 * BankConfig, PaymentMethodConfig, SignupChannelConfig 등
 * code/isActive 구조를 공유하는 설정 엔티티 인터페이스.
 */
public interface Configurable {
    Long getSeq();
    String getCode();
    Boolean getIsActive();
    void setIsActive(Boolean isActive);
}
