import React, { useState } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { format, isValid, parseISO, subMonths } from 'date-fns';

const PERIODS = [
    { label: '1M', months: 1 },
    { label: '3M', months: 3 },
    { label: '6M', months: 6 },
    { label: '1Y', months: 12 },
    { label: '전체', months: null },
];

const VERDICT_COLOR = {
    BUY_NOW:    '#22C55E',
    GOOD_OFFER: '#F59E0B',
    WAIT:       '#EF4444',
    TRACKING:   '#3B82F6',
};

// 일반 dot: 작고 깔끔한 stroke-first 도형
// active dot: 동일 도형 + 크기 업 + 후광 (pulse 없음)
const renderPSShape = (cx, cy, verdict, isActive) => {
    const color = VERDICT_COLOR[verdict] ?? VERDICT_COLOR.TRACKING;
    const r     = isActive ? 6.5 : 4;
    const sw    = isActive ? 2.5 : 2;
    const fi    = isActive ? 0.18 : 0.08;

    const shapeProps = { fill: color, fillOpacity: fi, stroke: color, strokeWidth: sw };

    let shape;
    if (verdict === 'BUY_NOW') {
        shape = <circle cx={cx} cy={cy} r={r} {...shapeProps} />;
    } else if (verdict === 'GOOD_OFFER') {
        const pts = `${cx},${cy - r} ${cx - r * 0.866},${cy + r * 0.5} ${cx + r * 0.866},${cy + r * 0.5}`;
        shape = <polygon points={pts} {...shapeProps} strokeLinejoin="round" />;
    } else if (verdict === 'WAIT') {
        const d = r * 0.7;
        shape = (
            <>
                <line x1={cx - d} y1={cy - d} x2={cx + d} y2={cy + d} stroke={color} strokeWidth={sw + 0.5} strokeLinecap="round" />
                <line x1={cx + d} y1={cy - d} x2={cx - d} y2={cy + d} stroke={color} strokeWidth={sw + 0.5} strokeLinecap="round" />
            </>
        );
    } else {
        shape = <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} {...shapeProps} rx={1} />;
    }

    return (
        <g>
            {isActive && (
                <circle cx={cx} cy={cy} r={r + 7} fill={color} opacity={0.12} />
            )}
            {shape}
        </g>
    );
};

const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    return renderPSShape(cx, cy, payload.verdict, false);
};

const CustomActiveDot = (props) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    return renderPSShape(cx, cy, payload.verdict, true);
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length > 0 && payload[0]?.payload) {
        const { price, discountRate, verdict, fullDate } = payload[0].payload;

        let color = "#3B82F6";
        if (verdict === 'BUY_NOW') color = "#22C55E";
        else if (verdict === 'GOOD_OFFER') color = "#F59E0B";
        else if (verdict === 'WAIT') color = "#EF4444";

        return (
            <div className="bg-base rounded-xl shadow-lg border z-[110]"
                 style={{ borderColor: `${color}80`, boxShadow: `0 0 20px ${color}20` }}>
                <div className="bg-surface p-4 rounded-xl">
                    <p className="text-secondary text-xs font-bold mb-1 tracking-wider">{fullDate} 기록</p>
                    <div className="flex items-center gap-3">
                        <p className="text-xl font-black flex items-center gap-2 text-primary">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}></span>
                            {Number(price).toLocaleString()}원
                        </p>
                        {discountRate > 0 && (
                            <span className="px-2 py-0.5 rounded border text-xs font-black tracking-wider"
                                  style={{ backgroundColor: `${color}15`, color: color, borderColor: `${color}40` }}>
                                -{discountRate}%
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }
    return null;
};


export default function PriceChart({ historyData, lowestPrice }) {
    const [selectedPeriod, setSelectedPeriod] = useState(null); // null = 전체

    if (!historyData || historyData.length === 0) {
        return <div className="text-secondary text-sm text-center py-10 font-bold">가격 데이터가 수집 중입니다.</div>;
    }

    // Step 1: 전체 데이터 파싱
    const allMapped = historyData.map(item => {
        try {
            const dateObj = item.date ? parseISO(item.date) : null;
            if (!isValid(dateObj)) return null;
            return {
                rawDate: dateObj,
                year: dateObj.getFullYear(),
                price: item.price,
                discountRate: item.discountRate || 0,
                verdict: item.verdict || 'TRACKING'
            };
        } catch {
            return null;
        }
    }).filter(Boolean);

    if (allMapped.length === 0) {
        return <div className="text-secondary text-sm text-center py-10 font-bold">유효한 가격 데이터가 없습니다.</div>;
    }

    // Step 2: 기간 필터링
    const cutoff = selectedPeriod ? subMonths(new Date(), selectedPeriod) : null;
    const filtered = cutoff ? allMapped.filter(item => item.rawDate >= cutoff) : allMapped;

    // Step 3: 필터된 데이터 기준으로 다년도 판단 → 포맷 결정
    const years = [...new Set(filtered.map(d => d.year))];
    const isMultiYear = years.length > 1;

    // Step 4: 차트 데이터 생성
    let data = filtered.map(item => ({
        date: isMultiYear ? format(item.rawDate, 'yy.MM.dd') : format(item.rawDate, 'MM.dd'),
        fullDate: format(item.rawDate, 'yyyy.MM.dd'),
        price: item.price,
        discountRate: item.discountRate,
        verdict: item.verdict
    }));

    // 역대 최저가 기준선 표시 여부
    const showReferenceLine = lowestPrice && lowestPrice > 0;

    // Y축 도메인: 역대 최저가가 항상 차트 범위에 포함되도록
    const yDomain = showReferenceLine
        ? [
            (dataMin) => Math.floor(Math.min(dataMin, lowestPrice) * 0.92),
            (dataMax) => Math.ceil(dataMax * 1.08)
          ]
        : ['auto', 'auto'];

    const periodTabs = (
        <div className="flex items-center justify-between gap-2 mt-4 mb-2 flex-wrap">
            <div className="flex items-center gap-1">
                {PERIODS.map(p => (
                    <button
                        key={p.label}
                        onClick={() => setSelectedPeriod(p.months)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            selectedPeriod === p.months
                                ? 'bg-ps-blue text-white shadow-sm'
                                : 'text-secondary hover:text-primary hover:bg-surface-hover'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
            {showReferenceLine && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="w-4 border-t border-dashed border-green-500"></div>
                    <span className="text-[11px] font-bold text-green-600 dark:text-green-500 whitespace-nowrap">
                        역대 최저 {Number(lowestPrice).toLocaleString()}원
                    </span>
                </div>
            )}
        </div>
    );

    // 선택한 기간에 데이터 없음
    if (data.length === 0) {
        return (
            <div>
                {periodTabs}
                <div className="text-secondary text-sm text-center py-10 font-bold">
                    이 기간의 가격 데이터가 없습니다.
                </div>
            </div>
        );
    }

    if (data.length === 1) {
        data = [{ ...data[0] }, { ...data[0], date: '오늘', fullDate: '오늘' }];
    }

    return (
        <div>
            {periodTabs}
            <div className="w-full h-[250px] md:h-[300px] select-none relative group">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 16, right: 25, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" opacity={0.5} vertical={false} />

                        <XAxis
                            dataKey="date"
                            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 'bold' }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis
                            domain={yDomain}
                            tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 'bold' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${value >= 10000 ? (value / 10000).toFixed(value % 10000 === 0 ? 0 : 1) + '만' : value}`}
                        />

                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ stroke: 'var(--color-border-default)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />

                        {/* 역대 최저가 기준선: 항상 표시, 초록 점선 + 우측 끝 원 + 레이블 */}
                        {showReferenceLine && (
                            <ReferenceLine
                                y={lowestPrice}
                                stroke="#22C55E"
                                strokeDasharray="5 3"
                                strokeWidth={1.5}
                            />
                        )}

                        <Area type="stepAfter" dataKey="price" stroke="none" fill="url(#colorPrice)" />

                        <Line
                            type="stepAfter"
                            dataKey="price"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            dot={<CustomDot />}
                            activeDot={<CustomActiveDot />}
                            animationDuration={1000}
                            isAnimationActive={true}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
