package com.culcom.util;

import java.security.SecureRandom;

/**
 * 단축 코드용 영숫자 random 생성 유틸.
 *
 * 8자 길이 기준 62^8 ≈ 218조 으로 충돌 확률이 무시할 수 있는 수준.
 * 호출자가 unique 보장이 필요한 경우 DB existsByCode 체크와 함께 재시도 루프로 사용.
 */
public final class CodeGenerator {

    private static final String CHARSET =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    private static final SecureRandom RANDOM = new SecureRandom();

    private CodeGenerator() {}

    public static String generate(int length) {
        if (length <= 0) throw new IllegalArgumentException("length must be positive");
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CHARSET.charAt(RANDOM.nextInt(CHARSET.length())));
        }
        return sb.toString();
    }
}
