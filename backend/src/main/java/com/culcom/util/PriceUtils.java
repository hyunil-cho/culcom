package com.culcom.util;

public final class PriceUtils {

    private PriceUtils() {}

    /**
     * "100,000원", "₩50,000" 등 가격 문자열에서 숫자만 추출하여 Long으로 반환.
     * null·빈 문자열·파싱 불가 시 null 반환.
     */
    public static Long parse(String s) {
        if (s == null) return null;
        String digits = s.replaceAll("[^0-9-]", "");
        if (digits.isEmpty() || "-".equals(digits)) return null;
        try { return Long.parseLong(digits); } catch (NumberFormatException e) { return null; }
    }
}
