import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";

// GA4 초기화는 앱 전체에서 1회만 실행 (모듈 레벨 싱글톤 패턴)
const trackingId = import.meta.env.VITE_GA_MEASUREMENT_ID;

if (trackingId) {
    ReactGA.initialize(trackingId);
} else if (import.meta.env.DEV) {
    console.warn("GA4 Tracking ID not found in .env");
}

const RouteChangeTracker = () => {
    const location = useLocation();

    // 페이지 경로(pathname + search) 변경 시마다 페이지뷰 전송
    useEffect(() => {
        if (trackingId) {
            ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
        }
    }, [location]);

    return null;
};

export default RouteChangeTracker;