package com.pstracker.catalog_service.announcement.dto;

import com.pstracker.catalog_service.announcement.domain.Announcement;

import java.time.LocalDateTime;

public record AnnouncementResponse(
        Long id,
        String type,
        String title,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static AnnouncementResponse from(Announcement announcement) {
        return new AnnouncementResponse(
                announcement.getId(),
                announcement.getType().name(),
                announcement.getTitle(),
                announcement.getContent(),
                announcement.getCreatedAt(),
                announcement.getUpdatedAt()
        );
    }
}
