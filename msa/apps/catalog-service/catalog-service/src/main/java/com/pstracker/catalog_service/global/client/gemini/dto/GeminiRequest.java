package com.pstracker.catalog_service.global.client.gemini.dto;

import java.util.List;

public record GeminiRequest(List<GeminiContent> contents) {}
