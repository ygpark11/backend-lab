package com.example.db_lab.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "posts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @ManyToOne(fetch = FetchType.EAGER) // 1. User와의 관계 설정
    @JoinColumn(name = "user_id")
    private User user;

    public Post(String title, User user) {
        this.title = title;
        this.user = user;
    }
}
