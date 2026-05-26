package com.pstracker.catalog_service.notice.domain;

import com.pstracker.catalog_service.global.domain.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "notice")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notice extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private NoticeType type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    public static Notice createNotice(NoticeType type, String title, String content) {
        Notice notice = new Notice();
        notice.type = type;
        notice.title = title;
        notice.content = content;
        return notice;
    }

    public void update(NoticeType type, String title, String content) {
        this.type = type;
        this.title = title;
        this.content = content;
    }
}
