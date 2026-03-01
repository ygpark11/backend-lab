package com.pstracker.catalog_service.notice.service;

import com.pstracker.catalog_service.notice.dto.NoticeRes;
import com.pstracker.catalog_service.notice.repository.NoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoticeService {

    private final NoticeRepository noticeRepository;

    /**
     * 공지사항 목록 페이징 조회 (최신순)
     */
    public Page<NoticeRes> getNotices(Pageable pageable) {
        return noticeRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(NoticeRes::new);
    }

    // TODO createNotice, updateNotice, deleteNotice 하위에 개발
}
