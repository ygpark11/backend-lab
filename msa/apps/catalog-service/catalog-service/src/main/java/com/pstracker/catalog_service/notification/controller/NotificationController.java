package com.pstracker.catalog_service.notification.controller;

import com.pstracker.catalog_service.global.security.MemberPrincipal;
import com.pstracker.catalog_service.notification.dto.FcmTokenRequest;
import com.pstracker.catalog_service.notification.dto.NotificationListResponse;
import com.pstracker.catalog_service.notification.service.NotificationService;
import com.pstracker.catalog_service.notification.service.NotificationTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationTokenService notificationTokenService;

    /**
     * 알림 목록 조회
     * filter=unread (기본값): 안읽음 목록 전체
     * filter=all: 전체 목록 (Slice 페이징)
     */
    @GetMapping
    public ResponseEntity<NotificationListResponse> getNotifications(
            @RequestParam(defaultValue = "unread") String filter,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal MemberPrincipal principal
    ) {
        Long memberId = principal.getMemberId();
        if ("all".equals(filter)) {
            return ResponseEntity.ok(notificationService.getAllNotifications(memberId, pageable));
        }
        return ResponseEntity.ok(notificationService.getUnreadNotifications(memberId));
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

    @PatchMapping("/read-all")
    public ResponseEntity<Void> readAllNotifications(
            @AuthenticationPrincipal MemberPrincipal principal
    ) {
        notificationService.markAllAsRead(principal.getMemberId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/token")
    public ResponseEntity<Void> registerFcmToken(
            @AuthenticationPrincipal MemberPrincipal memberPrincipal,
            @Valid @RequestBody FcmTokenRequest request
    ) {
        notificationTokenService.saveToken(memberPrincipal.getMemberId(), request.token());
        return ResponseEntity.ok().build();
    }
}
