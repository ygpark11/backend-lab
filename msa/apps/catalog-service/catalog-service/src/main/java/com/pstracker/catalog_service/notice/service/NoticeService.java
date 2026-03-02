package com.pstracker.catalog_service.notice.service;

import com.pstracker.catalog_service.notice.domain.Notice;
import com.pstracker.catalog_service.notice.dto.NoticeReq;
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

    /**
     * 공지사항 생성 (관리자)
     */
    @Transactional
    public NoticeRes createNotice(NoticeReq req) {
        Notice notice = Notice.createNotice(
                req.getType(),
                req.getTitle(),
                req.getContent()
        );

        Notice savedNotice = noticeRepository.save(notice);
        return new NoticeRes(savedNotice);
    }

    /**
     * 공지사항 수정 (관리자)
     */
    @Transactional
    public NoticeRes updateNotice(Long id, NoticeReq req) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 공지사항을 찾을 수 없습니다. ID=" + id));

        notice.update(req.getType(), req.getTitle(), req.getContent());

        return new NoticeRes(notice);
    }

    /**
     * 공지사항 삭제 (관리자)
     */
    @Transactional
    public void deleteNotice(Long id) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 공지사항을 찾을 수 없습니다. ID=" + id));

        noticeRepository.delete(notice);
    }
}
