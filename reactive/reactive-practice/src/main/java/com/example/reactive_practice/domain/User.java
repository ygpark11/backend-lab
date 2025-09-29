package com.example.reactive_practice.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Table("users") // (1) 테이블 이름을 'users'로 지정
public class User {
    @Id // (2) 이 필드가 기본 키(Primary Key)임을 명시
    private Long id;

    private String name;

    private String email;
}
