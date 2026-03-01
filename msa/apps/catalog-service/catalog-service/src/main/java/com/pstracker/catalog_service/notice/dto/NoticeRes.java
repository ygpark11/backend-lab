package com.pstracker.catalog_service.notice.dto;

import com.pstracker.catalog_service.notice.domain.Notice;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class NoticeRes {
    private Long id;
    private String type;
    private String title;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public NoticeRes(Notice notice) {
        this.id = notice.getId();
        this.type = notice.getType().name();
        this.title = notice.getTitle();
        this.content = notice.getContent();
        this.createdAt = notice.getCreatedAt();
        this.updatedAt = notice.getUpdatedAt();
    }
}
