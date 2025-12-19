import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function PriceChart({ historyData }) {
    // 데이터가 1개 이하(변동 없음)일 때
    if (!historyData || historyData.length <= 1) {
        return (
            <div className="bg-ps-card rounded-xl p-8 text-center border border-white/5 mt-6">
                <p className="text-gray-400">📉 가격 변동 이력이 쌓이면 차트가 표시됩니다.</p>
            </div>
        );
    }

    const labels = historyData.map((d) => format(new Date(d.date), 'MM.dd'));
    const prices = historyData.map((d) => d.price);

    const data = {
        labels,
        datasets: [
            {
                label: '가격 (KRW)',
                data: prices,
                borderColor: '#0070D1', // PS Blue
                backgroundColor: 'rgba(0, 112, 209, 0.15)', // 투명한 Blue
                tension: 0.2,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#fff',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#222',
                titleColor: '#fff',
                bodyColor: '#ddd',
                borderColor: '#444',
                borderWidth: 1,
                callbacks: {
                    label: (context) => ` ${context.raw.toLocaleString()}원`,
                },
            },
        },
        scales: {
            y: {
                grid: { color: '#333' }, // 어두운 그리드
                ticks: { color: '#888' },
            },
            x: {
                grid: { display: false },
                ticks: { color: '#888' },
            },
        },
    };

    return (
        <div className="bg-ps-card p-6 rounded-xl shadow-lg mt-8 border border-white/5">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">📉 가격 변동 추이</h3>
            <div className="h-72 w-full">
                <Line data={data} options={options} />
            </div>
        </div>
    );
}