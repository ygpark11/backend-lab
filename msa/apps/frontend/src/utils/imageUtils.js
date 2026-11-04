// PS Store CDN은 ?w= 파라미터로 리사이징 지원
export const getOptimizedSrc = (src, width) => {
    if (!src || !width) return src;
    try {
        const url = new URL(src);
        if (url.hostname === 'image.api.playstation.com') {
            url.searchParams.set('w', String(width));
            return url.toString();
        }
    } catch {
        // 유효하지 않은 URL은 원본 반환
    }
    return src;
};
