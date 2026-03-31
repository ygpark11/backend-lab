import React from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, isValid, parseISO } from 'date-fns';

const renderPSButton = (cx, cy, verdict, isActive = false) => {
    const scale = isActive ? 1.3 : 0.9;
    const strokeW = isActive ? 3 : 2.5;
    const bgOpacity = isActive ? "0.3" : "0.15";

    const innerFill = "var(--color-bg-base)";

    switch (verdict) {
        case 'BUY_NOW':
            return (
                <g className="transition-all duration-300">
                    <circle cx={cx} cy={cy} r={12 * scale} fill="#22C55E" opacity={bgOpacity} className="animate-pulse" />
                    <circle cx={cx} cy={cy} r={5 * scale} fill={innerFill} stroke="#22C55E" strokeWidth={strokeW} />
                </g>
            );
        case 'GOOD_OFFER':
            const tR = 6 * scale;
            const points = `${cx},${cy - tR} ${cx - tR * 0.866},${cy + tR * 0.5} ${cx + tR * 0.866},${cy + tR * 0.5}`;
            return (
                <g className="transition-all duration-300">
                    <circle cx={cx} cy={cy} r={12 * scale} fill="#F59E0B" opacity={bgOpacity} className="animate-pulse" />
                    <polygon points={points} fill={innerFill} stroke="#D97706" strokeWidth={strokeW} strokeLinejoin="round" />
                </g>
            );
        case 'WAIT':
            const xR = 4 * scale;
            return (
                <g className="transition-all duration-300">
                    <circle cx={cx} cy={cy} r={12 * scale} fill="#EF4444" opacity={bgOpacity} />
                    <path d={`M ${cx - xR} ${cy - xR} L ${cx + xR} ${cy + xR} M ${cx + xR} ${cy - xR} L ${cx - xR} ${cy + xR}`}
                          stroke="#EF4444" strokeWidth={strokeW + 0.5} strokeLinecap="round" />
                </g>
            );
        case 'TRACKING':
        default:
            const sR = 4.5 * scale;
            return (
                <g className="transition-all duration-300">
                    <circle cx={cx} cy={cy} r={12 * scale} fill="#3B82F6" opacity={bgOpacity} />
                    <rect x={cx - sR} y={cy - sR} width={sR * 2} height={sR * 2} fill={innerFill} stroke="#3B82F6" strokeWidth={strokeW} rx={1} />
                </g>
            );
    }
};

const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    return renderPSButton(cx, cy, payload.verdict, false);
};

const CustomActiveDot = (props) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    return renderPSButton(cx, cy, payload.verdict, true);
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length > 0 && payload[0]?.payload) {
        const { price, discountRate, verdict } = payload[0].payload;

        let color = "#3B82F6";
        if (verdict === 'BUY_NOW') color = "#22C55E";
        else if (verdict === 'GOOD_OFFER') color = "#F59E0B";
        else if (verdict === 'WAIT') color = "#EF4444";

        return (
            <div className="bg-base rounded-xl shadow-lg border z-[110]"
                 style={{ borderColor: `${color}80`, boxShadow: `0 0 20px ${color}20` }}>
                <div className="bg-surface p-4 rounded-xl">
                    <p className="text-secondary text-xs font-bold mb-1 tracking-wider">{label} 기록</p>
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

export default function PriceChart({ historyData }) {
    if (!historyData || historyData.length === 0) return <div className="text-secondary text-sm text-center py-10 font-bold">가격 데이터가 수집 중입니다.</div>;

    let data = historyData.map(item => {
        try {
            const dateObj = item.date ? parseISO(item.date) : null;
            if (!isValid(dateObj)) return null;

            return {
                date: format(dateObj, 'MM.dd'),
                price: item.price,
                discountRate: item.discountRate || 0,
                verdict: item.verdict || 'TRACKING'
            };
        } catch (e) {
            return null;
        }
    }).filter(item => item !== null);

    if (data.length === 1) {
        data = [ { ...data[0] }, { ...data[0], date: '오늘' } ];
    }

    if (data.length === 0) return <div className="text-secondary text-sm text-center py-10 font-bold">유효한 가격 데이터가 없습니다.</div>;

    return (
        <div className="w-full h-[250px] md:h-[300px] select-none relative group mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 25, right: 25, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" opacity={0.5} vertical={false} />

                    <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value >= 10000 ? value/10000 + '만' : value}`} />

                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-border-default)', strokeWidth: 1, strokeDasharray: '4 4' }} />

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
    );
}