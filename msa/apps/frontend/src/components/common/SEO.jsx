import { Helmet } from 'react-helmet-async';

const DEFAULT_TITLE = "PS-Tracker";
const DEFAULT_DESC = "플레이스테이션 게임 최저가 추적 및 AI 추천 플랫폼";
const DEFAULT_IMAGE = "/favicon.ico";
const DEFAULT_URL = "https://ps-signal.com";

const SEO = ({ title, description, image, url }) => {
    const pageTitle = title ? `${title} | PS-Tracker` : DEFAULT_TITLE;
    const pageDesc = description || DEFAULT_DESC;
    const pageImage = image || DEFAULT_IMAGE;
    const pageUrl = url || DEFAULT_URL;

    return (
        <Helmet>
            {/* 1. 기본 메타 태그 */}
            <title>{pageTitle}</title>
            <meta name="description" content={pageDesc} />

            {/* 2. Open Graph (카카오톡, 페이스북, 디스코드 공유 시) */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={pageUrl} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDesc} />
            <meta property="og:image" content={pageImage} />
            <meta property="og:site_name" content="PS-Tracker" />

            {/* 3. Twitter Card (트위터 공유 시) */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={pageDesc} />
            <meta name="twitter:image" content={pageImage} />
        </Helmet>
    );
};

export default SEO;