package com.pstracker.catalog_service.catalog.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class WishlistRequest {
    private Integer targetPrice;
}
