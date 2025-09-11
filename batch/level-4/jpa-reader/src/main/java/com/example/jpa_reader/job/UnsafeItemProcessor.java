package com.example.jpa_reader.job;

import com.example.jpa_reader.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.stereotype.Component;

@Slf4j
@Component // (1) 이 Processor를 스프링 빈으로 등록합니다.
public class UnsafeItemProcessor implements ItemProcessor<User, User> {

    private int count = 0; // (2) 여러 스레드가 공유하는 위험한 상태(State)

    @Override
    public User process(User user) throws Exception {
        count++; // (3) 여러 스레드가 이 값을 동시에 바꾸려고 경쟁합니다.
        log.info("Thread: [{}], User ID: [{}], Count: [{}]",
                Thread.currentThread().getName(), user.getId(), count);
        return user;
    }
}
