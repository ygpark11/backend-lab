package com.pstracker.catalog_service.notice.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class NoticeCreatedEvent {
    private String title;
    private String content;
}
