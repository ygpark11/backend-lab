package com.pstracker.catalog_service.member.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MyPagePioneeredGameDto {
    private Long id;
    private String title;
    private String imageUrl;
    private String date;
}
