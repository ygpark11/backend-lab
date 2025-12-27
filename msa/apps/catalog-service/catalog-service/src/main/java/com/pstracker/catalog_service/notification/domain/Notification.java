package com.pstracker.catalog_service.notification.domain;

import com.pstracker.catalog_service.member.domain.Member;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String message;

    @Column(name = "game_id")
    private Long gameId;

    @Column(name = "is_read", nullable = false)
    private boolean isRead;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // 생성 메서드
    public static Notification create(Member member, String title, String message, Long gameId) {
        Notification notification = new Notification();
        notification.member = member;
        notification.title = title;
        notification.message = message;
        notification.gameId = gameId;
        notification.isRead = false;
        notification.createdAt = LocalDateTime.now();
        return notification;
    }

    // 읽음 처리 메서드
    public void markAsRead() {
        this.isRead = true;
    }
}