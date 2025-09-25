package com.example.reactive_practice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor // 모든 필드를 인자로 받는 생성자를 만듭니다.
public class PostResponse {
    private String title;
    private String body;
}
