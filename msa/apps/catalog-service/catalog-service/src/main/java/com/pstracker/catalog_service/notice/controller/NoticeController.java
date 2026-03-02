package com.pstracker.catalog_service.notice.controller;

import com.pstracker.catalog_service.notice.dto.NoticeReq;
import com.pstracker.catalog_service.notice.dto.NoticeRes;
import com.pstracker.catalog_service.notice.service.NoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;

    @GetMapping
    public Page<NoticeRes> getNotices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return noticeService.getNotices(PageRequest.of(page, size));
    }

    @PostMapping
    public ResponseEntity<NoticeRes> createNotice(@Validated @RequestBody NoticeReq req) {
        NoticeRes createdNotice = noticeService.createNotice(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdNotice);
    }

    @PutMapping("/{id}")
    public ResponseEntity<NoticeRes> updateNotice(
            @PathVariable Long id,
            @Validated @RequestBody NoticeReq req) {
        NoticeRes updatedNotice = noticeService.updateNotice(id, req);
        return ResponseEntity.ok(updatedNotice);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotice(@PathVariable Long id) {
        noticeService.deleteNotice(id);
        return ResponseEntity.noContent().build();
    }
}
