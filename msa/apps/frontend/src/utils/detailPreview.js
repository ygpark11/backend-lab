// 게임 상세 모달을 데이터 도착 전에 먼저 그리기 위한 미리보기 정보.
// 진입 경로마다 필드명이 달라(name/title, price/currentPrice, allTimeLowPrice/lowestPrice) 상세 응답 필드명으로 맞춤.
// 응답에 없는 값은 null로 두어, 상세 화면이 추측해 그리지 않고 같은 크기의 자리로 비워 두게 함
export const buildDetailPreview = (game) => {
    if (!game) return null;
    const id = game.gameId ?? game.id;
    if (id == null) return null;
    return {
        id,
        title: game.title ?? game.name ?? '',
        imageUrl: game.imageUrl ?? null,
        currentPrice: game.currentPrice ?? game.price ?? null,
        originalPrice: game.originalPrice ?? null,
        lowestPrice: game.lowestPrice ?? game.allTimeLowPrice ?? null,
        discountRate: game.discountRate ?? null,
        priceVerdict: game.priceVerdict ?? null,
        isAllTimeLowNew: game.isAllTimeLowNew ?? game.allTimeLowNew ?? null,
        isPlusExclusive: game.isPlusExclusive ?? game.plusExclusive ?? null,
        saleEndDate: game.saleEndDate ?? null,
        createdAt: game.createdAt ?? null,
        displayScore: game.displayScore ?? null,
        pioneerName: game.pioneerName ?? null,
        topVibeTag: game.topVibeTag ?? null,
        genres: Array.isArray(game.genres) ? game.genres : null,
        liked: game.liked ?? null,
    };
};
