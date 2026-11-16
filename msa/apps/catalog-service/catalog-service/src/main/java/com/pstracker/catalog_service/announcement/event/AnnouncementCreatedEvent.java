package com.pstracker.catalog_service.announcement.event;

public record AnnouncementCreatedEvent(
        String title,
        String content
) {
}
