package com.pstracker.catalog_service.subscription.repository;

import com.pstracker.catalog_service.subscription.domain.PsPlusMonthlyHistory;
import com.pstracker.catalog_service.subscription.dto.MonthlyGameArchiveResponse;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;

import java.util.List;
import java.util.stream.Collectors;

import static com.pstracker.catalog_service.subscription.domain.QPsPlusMonthlyHistory.psPlusMonthlyHistory;

@RequiredArgsConstructor
public class PsPlusMonthlyHistoryRepositoryCustomImpl implements PsPlusMonthlyHistoryRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<MonthlyGameArchiveResponse> findMonthlyArchivePage(Pageable pageable) {

        // 1. '월(Month)' 기준으로 페이징 (Row 단위 잘림 방지)
        List<String> targetMonths = queryFactory
                .select(psPlusMonthlyHistory.targetMonth).distinct()
                .from(psPlusMonthlyHistory)
                .orderBy(psPlusMonthlyHistory.targetMonth.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        if (targetMonths.isEmpty()) {
            return Page.empty(pageable);
        }

        // 2. 확보된 '월'들에 해당하는 모든 게임 데이터 조회
        List<PsPlusMonthlyHistory> histories = queryFactory
                .selectFrom(psPlusMonthlyHistory)
                .where(psPlusMonthlyHistory.targetMonth.in(targetMonths))
                .fetch();

        // 3. 자바 단에서 그룹핑 후 Response DTO 변환
        List<MonthlyGameArchiveResponse> content = histories.stream()
                .collect(Collectors.groupingBy(PsPlusMonthlyHistory::getTargetMonth))
                .entrySet().stream()
                .map(entry -> {
                    List<MonthlyGameArchiveResponse.ArchiveGameDto> gameDtos = entry.getValue().stream()
                            .map(h -> new MonthlyGameArchiveResponse.ArchiveGameDto(
                                    h.getPsStoreId(), h.getTitle(), h.getImageUrl(), null // gameId는 아직 모름
                            )).toList();
                    return new MonthlyGameArchiveResponse(entry.getKey(), gameDtos);
                })
                .sorted((a, b) -> b.getTargetMonth().compareTo(a.getTargetMonth())) // 최신순 정렬
                .toList();

        // 4. Page 처리를 위한 Count 쿼리 (총 '월'의 개수)
        JPAQuery<Long> countQuery = queryFactory
                .select(psPlusMonthlyHistory.targetMonth.countDistinct())
                .from(psPlusMonthlyHistory);

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }
}