package com.pstracker.catalog_service.member.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MyPageSettingsDto {
    private boolean priceAlert;
    private boolean nightMode;
}
