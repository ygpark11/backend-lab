package com.pstracker.catalog_service.announcement.repository;

import com.pstracker.catalog_service.announcement.domain.Announcement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    Page<Announcement> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
