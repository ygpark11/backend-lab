import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// 데이터 조회 실패 안내: 무한 로딩이나 "데이터 없음"으로 오인되지 않도록 실패 사실과 재시도 버튼을 함께 표시
const LoadError = ({ message = '데이터를 불러오지 못했어요.', onRetry, className = '' }) => (
    <div role="alert" className={`flex flex-col items-center justify-center text-center gap-3 py-16 px-6 ${className}`}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--bento-red-from)] border border-[color:var(--bento-red-border)]">
            <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-sm font-bold text-primary break-keep">{message}</p>
        <p className="text-xs font-bold text-secondary break-keep">잠시 후 다시 시도해주세요.</p>
        {onRetry && (
            <button
                type="button"
                onClick={onRetry}
                className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-divider text-sm font-bold text-primary hover:bg-surface-hover transition-all active:scale-95"
            >
                <RefreshCw className="w-4 h-4" /> 다시 시도
            </button>
        )}
    </div>
);

export default LoadError;
