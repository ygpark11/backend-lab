package com.example.producer_app.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Getter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class MyMessage {
    private String uniqueId;
    private String messageId;
    private String messageContent;
}
