package com.culcom.config;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Aspect
@Component
@Slf4j
public class ControllerResponseLogAspect {

    @Around("execution(* com.culcom.controller..*(..))")
    public Object logRequestAndResponse(ProceedingJoinPoint joinPoint) throws Throwable {
        String controller = joinPoint.getSignature().getDeclaringType().getSimpleName();
        String method = joinPoint.getSignature().getName();

        log.debug("[{}] {} >>> args: {}", controller, method, Arrays.toString(joinPoint.getArgs()));

        Object result = joinPoint.proceed();

        if (result instanceof ResponseEntity<?> response) {
            int status = response.getStatusCode().value();

            log.debug("[{}] {} <<< status: {} | body: {}", controller, method, status, response.getBody());

            if (status < 200 || status >= 300) {
                log.info("[{}] {} returned {} | body: {}", controller, method, status, response.getBody());
            }
        }

        return result;
    }
}