package com.example.jpa_reader.repository;

import com.example.jpa_reader.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}
