import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";

const RouteChangeTracker = () => {
    const location = useLocation();
    const [initialized, setInitialized] = useState(false);

    // 1. 구글 애널리틱스 초기화
    useEffect(() => {
        const trackingId = import.meta.env.VITE_GA_MEASUREMENT_ID;

        if (trackingId) {
            ReactGA.initialize(trackingId);
            setInitialized(true);
        } else {
            console.warn("GA4 Tracking ID not found in .env");
        }
    }, []);

    // 2. 페이지 이동 감지 (경로가 바뀔 때마다 실행)
    useEffect(() => {
        if (initialized) {
            // 현재 경로(path) + 쿼리스트링(search)을 합쳐서 보고
            ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
        }
    }, [initialized, location]);

    return null;
};

export default RouteChangeTracker;