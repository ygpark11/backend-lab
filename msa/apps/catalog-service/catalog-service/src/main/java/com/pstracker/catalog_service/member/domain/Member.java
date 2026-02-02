package com.pstracker.catalog_service.member.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "members")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // 가입일
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // --- [OAuth2 확장을 위한 필드] ---
    private String provider;
    private String providerId;

    @Builder
    public Member(String email, String password, String nickname, Role role, String provider, String providerId) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.role = role;
        this.provider = provider;
        this.providerId = providerId;
        this.createdAt = LocalDateTime.now(); // 생성 시점 주입
    }

    // --- [비즈니스 메서드] ---
    public Member updateNickname(String nickname) {
        this.nickname = nickname;
        return this;
    }

    public String getRoleKey() {
        return this.role.getKey();
    }

    public boolean isAdmin() {
        return Role.ADMIN.equals(this.role);
    }
}