package com.pstracker.catalog_service.notification.domain;

import com.pstracker.catalog_service.member.domain.Member;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "fcm_tokens", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"member_id", "token"}) // 한 유저가 같은 토큰 중복 저장 방지
})
public class FcmToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false, length = 500)
    private String token;

    private LocalDateTime lastUsedAt;

    public FcmToken(Member member, String token) {
        this.member = member;
        this.token = token;
        this.lastUsedAt = LocalDateTime.now();
    }

    public void updateLastUsedAt() {
        this.lastUsedAt = LocalDateTime.now();
    }
}