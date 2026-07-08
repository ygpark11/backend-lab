package com.pstracker.catalog_service.announcement.domain;

import com.pstracker.catalog_service.global.domain.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "notice")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Announcement extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private AnnouncementType type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    public static Announcement create(AnnouncementType type, String title, String content) {
        Announcement announcement = new Announcement();
        announcement.type = type;
        announcement.title = title;
        announcement.content = content;
        return announcement;
    }

    public void update(AnnouncementType type, String title, String content) {
        this.type = type;
        this.title = title;
        this.content = content;
    }
}
