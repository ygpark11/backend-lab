package com.pstracker.catalog_service.announcement.dto;

import com.pstracker.catalog_service.announcement.domain.AnnouncementType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class AnnouncementRequest {
    @NotNull
    private AnnouncementType type;
    @NotBlank
    private String title;
    @NotBlank
    private String content;
}
