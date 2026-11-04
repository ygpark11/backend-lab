import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { VERDICT_GUIDE } from '../constants/priceGuide';

// 게임 목록 상단 서비스 소개 + 가격 신호등 범례 (정적 텍스트라 로딩 전후 높이 동일)
const ServiceIntro = () => (
    <section aria-labelledby="service-intro-title" className="mb-6 break-keep">
        <h1 id="service-intro-title" className="text-xl sm:text-2xl font-black tracking-tight text-primary">
            PS 게임, 지금 사도 될까?
        </h1>
        <p className="mt-1 text-sm font-bold text-secondary">
            PS Tracker는 PlayStation Store 가격을 매일 추적해서, 과거 가격 기록과 비교해 지금 살 만한지 알려드려요.
        </p>
        <div className="mt-3 flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {VERDICT_GUIDE.map(({ key, Icon, short, color, iconClass }) => (
                <span key={key} className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-divider text-xs font-bold text-secondary">
                    <Icon className={`w-3 h-3 ${color} ${iconClass}`} aria-hidden="true" />
                    {short}
                </span>
            ))}
            <Link to="/guide" className="shrink-0 flex items-center gap-0.5 px-1 text-xs font-bold text-ps-blue hover:underline">
                판단 기준 <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </Link>
        </div>
    </section>
);

export default ServiceIntro;
