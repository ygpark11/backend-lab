import { differenceInCalendarDays, parseISO } from 'date-fns';

// 할인 마감 배지 2단계 기준
// - 막차: 오늘·내일 종료 (백엔드 isClosingSoon 필터, 인사이트 '할인 마감 임박' 개수와 동일)
// - 마감 임박: 2~3일 남음
export const LAST_CALL_DAYS = 1;
export const CLOSING_SOON_DAYS = 3;

export const getSaleDeadline = (saleEndDate) => {
    if (!saleEndDate) return { daysLeft: null, isLastCall: false, isClosingSoon: false };
    const daysLeft = differenceInCalendarDays(parseISO(saleEndDate), new Date());
    const isLastCall = daysLeft >= 0 && daysLeft <= LAST_CALL_DAYS;
    const isClosingSoon = daysLeft > LAST_CALL_DAYS && daysLeft <= CLOSING_SOON_DAYS;
    return { daysLeft, isLastCall, isClosingSoon };
};
