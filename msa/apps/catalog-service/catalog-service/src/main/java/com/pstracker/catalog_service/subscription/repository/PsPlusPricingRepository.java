package com.pstracker.catalog_service.subscription.repository;

import com.pstracker.catalog_service.subscription.domain.PsPlusPricing;
import com.pstracker.catalog_service.subscription.domain.PsPlusTier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PsPlusPricingRepository extends JpaRepository<PsPlusPricing, Long> {
    Optional<PsPlusPricing> findByTier(PsPlusTier tier);
}
