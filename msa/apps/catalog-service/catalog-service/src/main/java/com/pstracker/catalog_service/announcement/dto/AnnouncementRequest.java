package com.pstracker.catalog_service.announcement.dto;

import com.pstracker.catalog_service.announcement.domain.AnnouncementType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AnnouncementRequest(
                @NotNull AnnouncementType type,
                @NotBlank String title,
                @NotBlank String content) {
}
