import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { format, isValid, parseISO } from 'date-fns';

// 커스텀 툴팁
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length > 0 && payload[0] && payload[0].value !== undefined && payload[0].value !== null) {
        return (
            <div className="bg-black/80 backdrop-blur-md border border-blue-500/30 p-4 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.2)] animate-fadeIn">
                <p className="text-gray-400 text-xs font-bold mb-1">{label}</p>
                <p className="text-white text-lg font-black flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]"></span>
                    {Number(payload[0].value).toLocaleString()}원 {/* Number()로 감싸서 한 번 더 방어 */}
                </p>
            </div>
        );
    }
    return null;
};

export default function PriceChart({ historyData }) {
    if (!historyData || historyData.length === 0) {
        return <div className="text-gray-500 text-sm text-center py-10">데이터가 충분하지 않습니다.</div>;
    }

    const data = historyData.map(item => {
        try {
            const dateObj = item.date ? parseISO(item.date) : null;

            if (!isValid(dateObj)) return null;

            return {
                date: format(dateObj, 'MM.dd'),
                price: item.price
            };
        } catch (e) {
            return null;
        }
    }).filter(item => item !== null);

    if (data.length === 0) {
        return <div className="text-gray-500 text-sm text-center py-10">유효한 차트 데이터가 없습니다.</div>;
    }

    return (
        <div className="w-full h-[250px] md:h-[300px] select-none">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                        <filter id="neonGlow" height="130%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                            <feOffset dx="0" dy="0" result="offsetblur"/>
                            <feFlood floodColor="#3B82F6" floodOpacity="0.6"/>
                            <feComposite in2="offsetblur" operator="in"/>
                            <feMerge>
                                <feMergeNode/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.15} vertical={false} />

                    <XAxis
                        dataKey="date"
                        tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                    />
                    <YAxis
                        tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${value >= 10000 ? value/10000 + '만' : value}`}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }} />

                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        fill="url(#colorPrice)"
                        filter="url(#neonGlow)"
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#fff', stroke: '#3B82F6', strokeOpacity: 0.5 }}
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}