package com.example.coupon_service.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CouponController {

    @GetMapping("/check/{couponId}")
    public ResponseEntity<String> checkCoupon(@PathVariable String couponId){
        String responseBody = "Coupon ID " + couponId + " is valid! (from Coupon Service)";
        return ResponseEntity.ok(responseBody);
    }
}
