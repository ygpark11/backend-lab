package com.pstracker.catalog_service.announcement.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AnnouncementCreatedEvent {
    private String title;
    private String content;
}
