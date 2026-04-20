package com.pstracker.catalog_service.global.client.gemini.dto;

import java.util.List;

public record GeminiResponse(List<GeminiCandidate> candidates) {}
