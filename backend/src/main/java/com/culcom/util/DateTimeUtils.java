package com.culcom.util;

import com.culcom.exception.InvalidDateFormatException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public final class DateTimeUtils {

    public static final String DATE_TIME_PATTERN = "yyyy-MM-dd HH:mm";
    public static final String DATE_PATTERN = "yyyy-MM-dd";

    public static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern(DATE_TIME_PATTERN);
    public static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern(DATE_PATTERN);

    private static final DateTimeFormatter[] FLEXIBLE_FORMATTERS = {
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DATE_TIME_FORMATTER,
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"),
    };

    private DateTimeUtils() {}

    public static LocalDateTime parse(String dateTime) {
        if (dateTime == null || dateTime.isBlank()) {
            throw new InvalidDateFormatException(dateTime);
        }
        try {
            return LocalDateTime.parse(dateTime, DATE_TIME_FORMATTER);
        } catch (DateTimeParseException e) {
            throw new InvalidDateFormatException(dateTime);
        }
    }

    /**
     * 여러 포맷(yyyy-MM-dd HH:mm:ss, yyyy-MM-dd HH:mm, yyyy-MM-ddTHH:mm)을 순서대로 시도하여 파싱한다.
     * 모든 포맷이 실패하면 InvalidDateFormatException을 던진다.
     */
    public static LocalDateTime parseFlexible(String dateTime) {
        if (dateTime == null || dateTime.isBlank()) {
            throw new InvalidDateFormatException(dateTime);
        }
        for (DateTimeFormatter formatter : FLEXIBLE_FORMATTERS) {
            try {
                return LocalDateTime.parse(dateTime, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }
        throw new InvalidDateFormatException(dateTime);
    }

    /**
     * 문자열을 LocalDate로 파싱한다. null이거나 빈 문자열이면 null을 반환한다.
     */
    public static LocalDate parseDate(String date) {
        if (date == null || date.isBlank()) return null;
        try {
            return LocalDate.parse(date);
        } catch (DateTimeParseException e) {
            throw new InvalidDateFormatException(date);
        }
    }

    public static String format(LocalDateTime dateTime) {
        if (dateTime == null) return null;
        return dateTime.format(DATE_TIME_FORMATTER);
    }

    public static String formatDate(LocalDateTime dateTime) {
        if (dateTime == null) return null;
        return dateTime.format(DATE_FORMATTER);
    }
}
