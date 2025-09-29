package com.example.reactive_practice.repository;

import com.example.reactive_practice.domain.User;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;

// JPA의 JpaRepository 대신 ReactiveCrudRepository를 상속
public interface UserRepository extends ReactiveCrudRepository<User, Long> {
}
