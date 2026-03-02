package com.pstracker.catalog_service.notice.dto;

import com.pstracker.catalog_service.notice.domain.NoticeType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class NoticeReq {
    @NotNull
    private NoticeType type;
    @NotBlank
    private String title;
    @NotBlank
    private String content;
}
