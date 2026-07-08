package com.pstracker.catalog_service.global.aop;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Slf4j
@Aspect
@Component
public class ServiceExecutionAspect {

    private static final long SLOW_EXECUTION_THRESHOLD_MS = 500;

    @Around("within(@org.springframework.stereotype.Service *)")
    public Object logServiceExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            return joinPoint.proceed();
        } finally {
            long elapsed = System.currentTimeMillis() - start;
            String className = joinPoint.getTarget().getClass().getSimpleName();
            String methodName = joinPoint.getSignature().getName();
            if (elapsed > SLOW_EXECUTION_THRESHOLD_MS) {
                log.warn("[SLOW] {}.{}() - {}ms (threshold: {}ms)",
                        className, methodName, elapsed, SLOW_EXECUTION_THRESHOLD_MS);
            } else {
                log.debug("[PERF] {}.{}() - {}ms", className, methodName, elapsed);
            }
        }
    }
}
