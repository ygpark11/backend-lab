import React, { useState, useEffect, useRef } from 'react';
import { X, Megaphone, Rocket, Wrench, Info, CalendarDays, ChevronRight, Triangle, Circle, Square, AlertTriangle, Loader2 } from 'lucide-react';
import client from '../api/client'; // 🚀 백엔드 API 호출용 클라이언트 임포트

// 🎮 PS 오리지널 컬러 & 도형 1:1 완벽 매칭
const getTypeConfig = (type) => {
    switch (type) {
        case 'UPDATE': // 업데이트 = 파란색 엑스
            return {
                icon: <Rocket className="w-3.5 h-3.5" />,
                label: '업데이트',
                color: 'text-[#4E6CBB]',
                bg: 'bg-[#4E6CBB]/10',
                border: 'border-[#4E6CBB]/30',
                glow: 'drop-shadow-[0_0_8px_rgba(78,108,187,0.8)]',
                NodeIcon: X,
                nodeStyle: 'stroke-[4px]'
            };
        case 'FIX': // 버그 수정 = 청록색 세모
            return {
                icon: <Wrench className="w-3.5 h-3.5" />,
                label: '버그 수정',
                color: 'text-[#00A39D]',
                bg: 'bg-[#00A39D]/10',
                border: 'border-[#00A39D]/30',
                glow: 'drop-shadow-[0_0_8px_rgba(0,163,157,0.8)]',
                NodeIcon: Triangle,
                nodeStyle: 'stroke-[3px]'
            };
        case 'MAINTENANCE': // 서버 점검 = 빨간색 동그라미
            return {
                icon: <AlertTriangle className="w-3.5 h-3.5" />,
                label: '서버 점검',
                color: 'text-[#FF3E3E]',
                bg: 'bg-[#FF3E3E]/10',
                border: 'border-[#FF3E3E]/30',
                glow: 'drop-shadow-[0_0_8px_rgba(255,62,62,0.8)]',
                NodeIcon: Circle,
                nodeStyle: 'stroke-[3px]'
            };
        case 'INFO': // 일반 공지 = 핑크색 네모
        default:
            return {
                icon: <Info className="w-3.5 h-3.5" />,
                label: '공지사항',
                color: 'text-[#E8789C]',
                bg: 'bg-[#E8789C]/10',
                border: 'border-[#E8789C]/30',
                glow: 'drop-shadow-[0_0_8px_rgba(232,120,156,0.8)]',
                NodeIcon: Square,
                nodeStyle: 'stroke-[3px]'
            };
    }
};

// 날짜 포맷 변환 함수 (YYYY. MM. DD)
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`;
};

const NoticeModal = ({ isOpen, onClose }) => {
    const [notices, setNotices] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // 인피니트 스크롤 관찰용 Ref
    const observerTarget = useRef(null);

    // 백엔드 API 호출 함수
    const fetchNotices = async (pageNumber) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const res = await client.get('/api/v1/notices', {
                params: { page: pageNumber, size: 10 }
            });

            const { content, last } = res.data;

            if (pageNumber === 0 && content.length > 0) {
                const latestId = content[0].id;
                localStorage.setItem('ps_last_notice_id', latestId.toString());
            }

            setNotices(prev => pageNumber === 0 ? content : [...prev, ...content]);
            setHasMore(!last);

        } catch (error) {
            console.error('공지사항 로드 실패:', error.response?.status === 401 ? '인증 오류(Security 확인 필요)' : error);
        } finally {
            setIsLoading(false);
        }
    };

    // 모달이 열릴 때마다 데이터 초기화 & 첫 페이지 호출
    useEffect(() => {
        if (isOpen) {
            setPage(0);
            setHasMore(true);
            setNotices([]);
            fetchNotices(0);
        }
    }, [isOpen]);

    // 인피니트 스크롤 Intersection Observer 적용
    useEffect(() => {
        if (!isOpen || !hasMore || isLoading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setPage((prevPage) => {
                        const nextPage = prevPage + 1;
                        fetchNotices(nextPage);
                        return nextPage;
                    });
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [isOpen, hasMore, isLoading]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-ps-black/90 border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] backdrop-blur-xl">

                {/* 헤더 */}
                <div className="shrink-0 bg-gradient-to-r from-gray-900 to-black p-6 border-b border-white/10 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute -left-10 -top-10 w-32 h-32 bg-[#4E6CBB]/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <Megaphone className="w-6 h-6 text-[#4E6CBB] drop-shadow-[0_0_10px_rgba(78,108,187,0.6)]" /> 패치노트
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">PS Tracker의 생생한 업데이트 소식을 확인하세요.</p>
                    </div>
                    <button onClick={onClose} className="relative z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* 타임라인 본문 (스크롤) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                    <div className="relative">

                        {/* 좌측 네온 타임라인 궤적 (공지사항이 있을 때만 표시) */}
                        {notices.length > 0 && (
                            <div className="absolute top-4 bottom-2 left-[15px] md:left-[19px] w-[2px] bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-full"></div>
                        )}

                        <div className="space-y-10">
                            {notices.length === 0 && !isLoading && (
                                <div className="text-center py-20 text-gray-500 font-bold">
                                    등록된 공지사항이 없습니다.
                                </div>
                            )}

                            {notices.map((notice) => {
                                const config = getTypeConfig(notice.type);
                                const NodeIcon = config.NodeIcon;

                                // 🚀 수정됨 체크 로직 (생성일과 수정일이 1초 이상 차이나면 수정된 글로 간주)
                                const isEdited = notice.updatedAt &&
                                    Math.abs(new Date(notice.updatedAt).getTime() - new Date(notice.createdAt).getTime()) > 1000;

                                return (
                                    <div key={notice.id} className="relative pl-12 md:pl-16 group">

                                        {/* 타임라인 노드 */}
                                        <div className="absolute left-[3px] md:left-[7px] top-4 w-6 h-6 rounded-full bg-ps-black border border-white/20 flex items-center justify-center z-10 shadow-[0_0_10px_rgba(0,0,0,1)] group-hover:scale-125 group-hover:border-white/50 transition-all duration-300">
                                            <NodeIcon className={`w-3.5 h-3.5 ${config.color} ${config.nodeStyle} ${config.glow}`} />
                                        </div>

                                        {/* 프리미엄 다크 글래스모피즘 카드 */}
                                        <div className="bg-black/40 border border-white/5 hover:border-white/20 rounded-2xl p-5 md:p-6 backdrop-blur-md transition-all shadow-xl group-hover:shadow-2xl group-hover:-translate-y-0.5">

                                            {/* 카드 헤더 (뱃지 & 날짜) */}
                                            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${config.bg} ${config.color} ${config.border}`}>
                                                        {config.icon} {config.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold">
                                                    <CalendarDays className="w-3.5 h-3.5" />
                                                    {formatDate(notice.createdAt)}
                                                    {/* 🚀 수정된 글이면 (수정됨) 마크 노출! */}
                                                    {isEdited && <span className="text-gray-600 font-medium ml-1">(수정됨)</span>}
                                                </div>
                                            </div>

                                            {/* 타이틀 */}
                                            <h3 className="text-lg md:text-xl font-bold text-white mb-4 tracking-tight transition-colors">
                                                {notice.title}
                                            </h3>

                                            {/* 본문 내용 (엔터키 기준 분리) */}
                                            <div className="space-y-3">
                                                {notice.content?.split('\n').map((text, idx) => {
                                                    if (!text.trim()) return null; // 빈 줄은 스킵
                                                    return (
                                                        <p key={idx} className="text-sm text-gray-400 flex items-start gap-2.5 leading-relaxed">
                                                            <ChevronRight className={`w-4 h-4 ${config.color} shrink-0 mt-0.5 opacity-50`} />
                                                            <span className="group-hover:text-gray-300 transition-colors">{text}</span>
                                                        </p>
                                                    );
                                                })}
                                            </div>

                                        </div>
                                    </div>
                                );
                            })}

                            {/* 인피니트 스크롤 로딩 & 바닥(센서) 영역 */}
                            <div ref={observerTarget} className="h-4 w-full" />

                            {isLoading && (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default NoticeModal;