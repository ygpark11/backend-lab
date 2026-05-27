package com.pstracker.catalog_service.notification.dto;

import java.util.List;

public record NotificationListResponse(
        List<NotificationResponse> content,
        boolean hasNext
) {
}
