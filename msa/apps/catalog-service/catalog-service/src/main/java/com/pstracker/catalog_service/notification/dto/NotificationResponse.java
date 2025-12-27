package com.pstracker.catalog_service.notification.dto;

import com.pstracker.catalog_service.notification.domain.Notification;
import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        String title,
        String message,
        Long gameId,
        boolean isRead,
        LocalDateTime createdAt
) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getGameId(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}