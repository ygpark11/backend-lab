import React, { useState, useEffect, useRef } from 'react';
import { X, Megaphone, Rocket, Wrench, Info, CalendarDays, ChevronRight, Triangle, Circle, Square, AlertTriangle, Loader2, Edit2, Trash2, Plus } from 'lucide-react'; // 🚀 Edit2, Trash2, Plus 추가
import client from '../api/client';
import { useCurrentUser } from '../hooks/useCurrentUser';
import toast from 'react-hot-toast';

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

    const [isEditing, setIsEditing] = useState(false); // 폼 화면 전환 트리거
    const [formData, setFormData] = useState({ type: 'INFO', title: '', content: '' });

    const { isAdmin } = useCurrentUser();
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

    const handleSubmit = async () => {
        if (!formData.title.trim() || !formData.content.trim()) {
            toast.error('제목과 내용을 모두 입력해주세요.');
            return;
        }

        const toastId = toast.loading(formData.id ? '수정 중...' : '등록 중...');
        try {
            if (formData.id) {
                // 수정 (PUT)
                await client.put(`/api/v1/notices/${formData.id}`, formData);
                toast.success('공지사항이 수정되었습니다.', { id: toastId });
            } else {
                // 신규 등록 (POST)
                await client.post('/api/v1/notices', formData);
                toast.success('공지사항이 등록되었습니다.', { id: toastId });
            }

            // 폼 닫기 및 초기화 후 리스트 새로고침
            setIsEditing(false);
            setFormData({ type: 'INFO', title: '', content: '' });
            setPage(0);
            setHasMore(true);
            setNotices([]);
            fetchNotices(0);

        } catch (error) {
            // 우리가 백엔드 GlobalExceptionHandler에서 던진 에러 메시지(String) 활용!
            toast.error(error.response?.data || '요청 처리에 실패했습니다.', { id: toastId });
        }
    };

    const handleDelete = (id) => {
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[250px] bg-[#1a1a1a] text-white p-2 border border-white/10 rounded-xl shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/20 p-2 rounded-lg"><AlertTriangle className="w-6 h-6 text-red-500" /></div>
                    <div>
                        <h4 className="font-bold text-sm text-red-400">공지사항 삭제</h4>
                        <p className="text-xs text-gray-400">정말 이 공지사항을 삭제하시겠습니까?</p>
                    </div>
                </div>
                <div className="flex gap-2 mt-2">
                    <button onClick={async () => {
                        toast.dismiss(t.id);
                        const toastId = toast.loading('데이터 파쇄 중...');
                        try {
                            await client.delete(`/api/v1/notices/${id}`);
                            toast.success('삭제가 완료되었습니다.', { id: toastId });
                            // 화면에서 즉시 렌더링 제외
                            setNotices(prev => prev.filter(notice => notice.id !== id));
                        } catch (error) {
                            toast.error('삭제 실패: 권한을 확인하세요.', { id: toastId });
                        }
                    }} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold transition-colors">
                        네, 삭제합니다
                    </button>
                    <button onClick={() => toast.dismiss(t.id)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-lg text-xs font-bold transition-colors">
                        취소
                    </button>
                </div>
            </div>
        ), {
            duration: 5000,
            style: { background: 'transparent', boxShadow: 'none', padding: 0 }
        });
    };

    const handleEditClick = (notice) => {
        setFormData({
            id: notice.id,
            type: notice.type,
            title: notice.title,
            content: notice.content
        });
        setIsEditing(true); // 폼 화면으로 전환
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
                                <Megaphone className="w-6 h-6 text-[#4E6CBB] drop-shadow-[0_0_10px_rgba(78,108,187,0.6)]" /> 새로운 소식
                            </h2>
                            <div className="flex items-center gap-4 mt-1">
                                <p className="text-gray-400 text-sm">PS Tracker의 생생한 업데이트 소식을 확인하세요.</p>
                                {/* 관리자 전용 새 글 작성 버튼 */}
                                {isAdmin && (
                                    <button
                                        onClick={() => {
                                            setFormData({ type: 'INFO', title: '', content: '' }); // 잔여 데이터 초기화
                                            setIsEditing(true);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-[#4E6CBB]/20 hover:bg-[#4E6CBB]/40 text-[#4E6CBB] hover:text-white border border-[#4E6CBB]/30 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> 새 공지 작성
                                    </button>
                                )}
                            </div>
                        </div>
                    <button
                        onClick={() => isEditing ? setIsEditing(false) : onClose()}
                        className="relative z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* 타임라인 본문 (스크롤) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                    {/* isEditing 상태에 따라 화면 전환 */}
                    {isEditing ? (
                        <div className="animate-fadeIn space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">공지 타입</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-ps-blue outline-none transition-all appearance-none"
                                >
                                    <option value="INFO">일반 공지 (INFO)</option>
                                    <option value="UPDATE">기능 업데이트 (UPDATE)</option>
                                    <option value="FIX">버그 수정 (FIX)</option>
                                    <option value="MAINTENANCE">서버 점검 (MAINTENANCE)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">제목</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    placeholder="공지사항 제목을 입력하세요"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-ps-blue outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">내용 (Markdown 형태의 줄바꿈 지원)</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                                    placeholder="여기에 내용을 입력하세요..."
                                    className="w-full h-48 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-ps-blue outline-none transition-all resize-none custom-scrollbar"
                                />
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-3.5 rounded-xl transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="flex-1 bg-ps-blue hover:bg-blue-600 text-white font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-colors"
                                >
                                    {formData.id ? '수정하기' : '등록하기'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative">

                            {/* 좌측 네온 타임라인 궤적 (공지사항이 있을 때만 표시) */}
                            {(notices.length > 0 || (isLoading && page === 0)) && (
                                <div className="absolute top-4 bottom-2 left-[15px] md:left-[19px] w-[2px] bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-full"></div>
                            )}

                            <div className="space-y-10">
                                {/* 1. 최초 로딩 시 (스켈레톤 UI) */}
                                {isLoading && page === 0 ? (
                                    Array.from({ length: 3 }).map((_, idx) => (
                                        <div key={`skeleton-${idx}`} className="relative pl-12 md:pl-16 group animate-pulse">
                                            {/* 스켈레톤 노드 */}
                                            <div className="absolute left-[3px] md:left-[7px] top-4 w-6 h-6 rounded-full bg-white/10 border border-white/5"></div>
                                            {/* 스켈레톤 카드 */}
                                            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 md:p-6 h-32 backdrop-blur-md">
                                                <div className="flex gap-2 mb-4">
                                                    <div className="w-20 h-6 bg-white/10 rounded-md"></div>
                                                    <div className="w-16 h-6 bg-white/5 rounded-md"></div>
                                                </div>
                                                <div className="w-3/4 h-5 bg-white/10 rounded mb-2"></div>
                                                <div className="w-1/2 h-4 bg-white/5 rounded"></div>
                                            </div>
                                        </div>
                                    ))
                                ) : notices.length === 0 && !isLoading ? (
                                    /* 데이터가 아예 없을 때 */
                                    <div className="text-center py-20 text-gray-500 font-bold">
                                        등록된 공지사항이 없습니다.
                                    </div>
                                ) : (
                                    /* 2. 실제 데이터 렌더링 */
                                    notices.map((notice) => {
                                        const config = getTypeConfig(notice.type);
                                        const NodeIcon = config.NodeIcon;

                                        return (
                                            <div key={notice.id} className="relative pl-12 md:pl-16 group">
                                                {/* 타임라인 노드 */}
                                                <div className="absolute left-[3px] md:left-[7px] top-4 w-6 h-6 rounded-full bg-ps-black border border-white/20 flex items-center justify-center z-10 shadow-[0_0_10px_rgba(0,0,0,1)] group-hover:scale-125 group-hover:border-white/50 transition-all duration-300">
                                                    <NodeIcon className={`w-3.5 h-3.5 ${config.color} ${config.nodeStyle} ${config.glow}`} />
                                                </div>

                                                {/* 프리미엄 다크 글래스모피즘 카드 */}
                                                <div className="bg-black/40 border border-white/5 hover:border-white/20 rounded-2xl p-5 md:p-6 backdrop-blur-md transition-all shadow-xl group-hover:shadow-2xl group-hover:-translate-y-0.5 relative group/card">

                                                    {/* 관리자 전용 수정/삭제 버튼 (평소엔 살짝 투명, 호버 시 선명) */}
                                                    {isAdmin && (
                                                        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-30 group-hover/card:opacity-100 transition-opacity">
                                                            <button onClick={() => handleEditClick(notice)} className="p-1.5 bg-blue-500/10 hover:bg-blue-500/30 text-blue-400 rounded-md transition-colors" title="수정">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleDelete(notice.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/30 text-red-500 rounded-md transition-colors" title="삭제">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className={`flex flex-wrap justify-between items-center gap-3 mb-4 ${isAdmin ? 'pr-16' : ''}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${config.bg} ${config.color} ${config.border}`}>
                                                                {config.icon} {config.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold">
                                                            <CalendarDays className="w-3.5 h-3.5" />
                                                            {formatDate(notice.createdAt)}
                                                        </div>
                                                    </div>
                                                    <h3 className="text-lg md:text-xl font-bold text-white mb-4 tracking-tight transition-colors">{notice.title}</h3>
                                                    <div className="space-y-3">
                                                        {notice.content?.split('\n').map((text, idx) => {
                                                            if (!text.trim()) return null;
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
                                    })
                                )}

                                {/* 인피니트 스크롤 로딩 & 바닥(센서) 영역 */}
                                {!isLoading && hasMore && notices.length > 0 && (
                                    <div ref={observerTarget} className="h-4 w-full" />
                                )}

                                {/* 3. 다음 페이지 넘길 때 하단 스피너 */}
                                {isLoading && page > 0 && (
                                    <div className="flex justify-center py-6">
                                        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                                    </div>
                                )}

                                {/* 4. 더 이상 읽을 게 없을 때 (마지막) */}
                                {!isLoading && !hasMore && notices.length > 0 && (
                                    <div className="py-12 text-center flex flex-col items-center gap-3 opacity-50 border-t border-white/5 mt-10">
                                        <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                        <p className="text-gray-400 font-bold text-sm">모든 공지사항을 확인하셨습니다</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default NoticeModal;