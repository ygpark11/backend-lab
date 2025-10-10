package com.example.db_lab.controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
public class MemoryController {

    private static final List<Object> longLivedObjects = new ArrayList<>();

    @GetMapping("/trigger-gc")
    public String triggerGc() {
        System.out.println("GC 발생을 유도합니다...");
        List<Object> list = new ArrayList<>();
        // 100만 개의 불필요한 객체를 생성하여 Eden 영역을 채움
        for (int i = 0; i < 1_000_000; i++) {
            list.add(new Object());
        }
        System.out.println("GC 유도 완료.");
        return "GC triggered! Check VisualVM.";
    }

    @GetMapping("/trigger-major-gc")
    public String triggerMajorGc() {
        System.out.println("Major GC 발생을 유도합니다...");
        // 100만 개의 장기 생존 객체를 생성하여 Old 영역을 채움
        for (int i = 0; i < 1_000_000; i++) {
            longLivedObjects.add(new Object());
        }
        System.out.println("Major GC 유도 완료.");
        return "Major GC triggered! Check VisualVM.";
    }

    @GetMapping("/cpu-intensive")
    public String cpuIntensiveWork() {
        System.out.println("CPU를 많이 사용하는 작업을 시작합니다...");
        String result = "";
        // CPU에 부담을 주는 반복적인 문자열 합치기 작업
        for (int i = 0; i < 100_000; i++) {
            result += " " + i;
        }
        System.out.println("CPU 작업 완료.");
        return "CPU intensive work finished!";
    }

    @GetMapping("/cpu-intensive-fixed")
    public String cpuIntensiveWorkFixed() {
        System.out.println("최적화된 CPU 작업을 시작합니다...");

        // 1. StringBuilder 생성
        StringBuilder sb = new StringBuilder();

        // 2. append 메소드로 문자열 추가
        for (int i = 0; i < 100000; i++) {
            sb.append(" ").append(i);
        }

        System.out.println("최적화된 CPU 작업 완료.");
        return "CPU intensive work (fixed) finished!";
    }
}
