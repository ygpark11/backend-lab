package com.pstracker.catalog_service.notification.controller;

import com.pstracker.catalog_service.global.security.MemberPrincipal;
import com.pstracker.catalog_service.notification.dto.NotificationResponse;
import com.pstracker.catalog_service.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal MemberPrincipal principal
    ) {
        return ResponseEntity.ok(notificationService.getMyNotifications(principal.getMemberId()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount(
            @AuthenticationPrincipal MemberPrincipal principal
    ) {
        return ResponseEntity.ok(notificationService.getUnreadCount(principal.getMemberId()));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> readNotification(
            @PathVariable Long id,
            @AuthenticationPrincipal MemberPrincipal principal
    ) {
        notificationService.markAsRead(id, principal.getMemberId());
        return ResponseEntity.ok().build();
    }
}