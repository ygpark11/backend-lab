package com.example.jpa_reader.job;

import com.example.jpa_reader.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Component
public class SafeItemProcessor implements ItemProcessor<User, User> {

    // (2) int 대신 AtomicInteger를 사용합니다.
    private final AtomicInteger count = new AtomicInteger(0);

    @Override
    public User process(User user) throws Exception {
        // (3) count++ 대신, 원자적 연산을 보장하는 incrementAndGet() 메서드를 사용합니다.
        int currentCount = count.incrementAndGet();
        log.info("Thread: [{}], User ID: [{}], Count: [{}]",
                Thread.currentThread().getName(), user.getId(), currentCount);
        return user;
    }
}
