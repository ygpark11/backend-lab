import React, { useState, useEffect, useRef } from 'react';
import { X, Megaphone, Rocket, Wrench, Info, CalendarDays, ChevronRight, Triangle, Circle, Square, AlertTriangle, Loader2, Edit2, Trash2, Plus, GripVertical } from 'lucide-react'; // 🚀 GripVertical 추가
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

const SmartTextRenderer = ({ content, config }) => {
    if (!content) return null;

    return (
        <div className="text-sm md:text-base text-gray-300 leading-[1.7]">
            {content.split('\n').map((line, idx) => {
                // 1. 빈 줄(엔터) 처리: 문단 나누기용 여백 제공
                if (!line.trim()) {
                    return <div key={idx} className="h-4 md:h-5"></div>;
                }

                // 2. 들여쓰기(Indentation) 파악 (스페이스 2칸 또는 탭 1번당 1레벨)
                const leadingSpaces = line.match(/^(\s*)/)[1];
                const indentLevel = Math.floor(leadingSpaces.replace(/\t/g, '  ').length / 2);

                // Tailwind 동적 클래스 컴파일 이슈를 피하기 위해 inline style 사용
                const indentStyle = { paddingLeft: indentLevel > 0 ? `${indentLevel * 1.2}rem` : '0' };
                const trimmedLine = line.trim();

                // 3. 💡 인용구(Blockquote) 처리: '> ' 로 시작할 경우 (트리 구조 설명이나 하이라이트용)
                if (trimmedLine.startsWith('> ')) {
                    const cleanText = trimmedLine.substring(2);
                    return (
                        <div key={idx} style={indentStyle} className="mt-2 mb-2">
                            <div className={`pl-3 md:pl-4 py-1.5 md:py-2 border-l-[3px] ${config.border} bg-black/20 rounded-r-lg`}>
                                <span className="text-gray-400 font-medium italic drop-shadow-md">{cleanText}</span>
                            </div>
                        </div>
                    );
                }

                // 4. 🌳 리스트 형태('- ' 또는 '* ') 처리 및 트리(자식) 구조 표현
                if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                    const cleanText = trimmedLine.substring(2);
                    const isSubList = indentLevel > 0; // 들여쓰기가 들어간 하위 리스트인지 판별

                    return (
                        <div key={idx} style={indentStyle} className="flex items-start gap-2.5 mt-2 ml-1 md:ml-2">
                            {isSubList ? (
                                // 자식 리스트: 은은한 빈 동그라미 불릿
                                <div className="w-1.5 h-1.5 rounded-full border border-gray-500 shrink-0 mt-[8.5px] md:mt-[10.5px] opacity-70" />
                            ) : (
                                // 부모 리스트: 메인 컬러 꺾쇠 아이콘
                                <ChevronRight className={`w-4 h-4 md:w-5 md:h-5 ${config.color} shrink-0 mt-[3px] md:mt-1 opacity-70`} />
                            )}
                            <span className="text-gray-400 group-hover/card:text-gray-300 transition-colors font-medium">{cleanText}</span>
                        </div>
                    );
                }

                // 5. 일반 문장 처리 (들여쓰기 반영)
                return (
                    <div key={idx} style={indentStyle} className="mb-1 text-gray-300 group-hover/card:text-white transition-colors">
                        {trimmedLine}
                    </div>
                );
            })}
        </div>
    );
};

const NoticeModal = ({ isOpen, onClose }) => {
    const [notices, setNotices] = useState([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ type: 'INFO', title: '', content: '' });

    const { isAdmin } = useCurrentUser();
    const observerTarget = useRef(null);

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
                await client.put(`/api/v1/notices/${formData.id}`, formData);
                toast.success('공지사항이 수정되었습니다.', { id: toastId });
            } else {
                await client.post('/api/v1/notices', formData);
                toast.success('공지사항이 등록되었습니다.', { id: toastId });
            }

            setIsEditing(false);
            setFormData({ type: 'INFO', title: '', content: '' });
            setPage(0);
            setHasMore(true);
            setNotices([]);
            fetchNotices(0);

        } catch (error) {
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
        setIsEditing(true);
    };

    useEffect(() => {
        if (isOpen) {
            setPage(0);
            setHasMore(true);
            setNotices([]);
            fetchNotices(0);
        }
    }, [isOpen]);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/90 md:bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#111] md:bg-ps-black/90 md:border md:border-white/10 md:rounded-2xl w-full h-full md:h-auto md:max-h-[85vh] max-w-3xl shadow-2xl relative overflow-hidden flex flex-col md:backdrop-blur-xl">

                {/* 헤더 */}
                <div className="shrink-0 bg-gradient-to-r from-gray-900 to-black p-4 md:p-6 border-b border-white/10 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute -left-10 -top-10 w-32 h-32 bg-[#4E6CBB]/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10 flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-3 mb-1 md:mb-2">
                            <Megaphone className="w-5 h-5 md:w-6 md:h-6 text-[#4E6CBB] drop-shadow-[0_0_10px_rgba(78,108,187,0.6)] shrink-0" />
                            <h2 className="text-lg md:text-2xl font-black text-white truncate">새로운 소식</h2>

                            {isAdmin && !isEditing && (
                                <button
                                    onClick={() => {
                                        setFormData({ type: 'INFO', title: '', content: '' });
                                        setIsEditing(true);
                                    }}
                                    className="hidden sm:flex shrink-0 items-center gap-1.5 px-2.5 py-1 bg-[#4E6CBB]/20 hover:bg-[#4E6CBB]/40 text-[#4E6CBB] hover:text-white border border-[#4E6CBB]/30 rounded-lg text-xs font-bold transition-colors ml-auto"
                                >
                                    <Plus className="w-3.5 h-3.5" /> 공지 작성
                                </button>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-gray-400 text-xs md:text-sm truncate">PS Tracker의 생생한 업데이트 소식을 확인하세요.</p>
                        </div>
                    </div>

                    <div className="relative z-10 flex items-center gap-2">
                        {isAdmin && !isEditing && (
                            <button onClick={() => { setFormData({ type: 'INFO', title: '', content: '' }); setIsEditing(true); }} className="sm:hidden p-2 rounded-full bg-[#4E6CBB]/20 text-[#4E6CBB] border border-[#4E6CBB]/30">
                                <Plus className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={() => isEditing ? setIsEditing(false) : onClose()}
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 bg-[#0a0a0a] md:bg-transparent">
                    {isEditing ? (
                        <div className="animate-fadeIn space-y-4 md:space-y-6">
                            <div>
                                <label className="block text-xs md:text-sm font-bold text-gray-400 mb-1.5 md:mb-2">공지 타입</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-ps-blue outline-none transition-all appearance-none text-sm md:text-base"
                                >
                                    <option value="INFO">일반 공지 (INFO)</option>
                                    <option value="UPDATE">기능 업데이트 (UPDATE)</option>
                                    <option value="FIX">버그 수정 (FIX)</option>
                                    <option value="MAINTENANCE">서버 점검 (MAINTENANCE)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs md:text-sm font-bold text-gray-400 mb-1.5 md:mb-2">제목</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    placeholder="공지사항 제목을 입력하세요"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-ps-blue outline-none transition-all text-sm md:text-base"
                                />
                            </div>
                            <div>
                                <label className="block text-xs md:text-sm font-bold text-gray-400 mb-1.5 md:mb-2 flex justify-between">
                                    <span>내용 작성 요령</span>
                                    <span className="text-gray-500 font-normal">'- ' 로 시작하면 리스트 형태(아이콘) 적용</span>
                                </label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                                    placeholder="내용을 입력하세요. 엔터를 두 번 치면 문단이 나뉩니다."
                                    className="w-full h-48 md:h-64 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-ps-blue outline-none transition-all resize-none custom-scrollbar text-sm md:text-base leading-relaxed"
                                />
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-white/10 pb-6 md:pb-0">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-3 md:py-3.5 rounded-xl transition-colors text-sm md:text-base"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="flex-1 bg-ps-blue hover:bg-blue-600 text-white font-black py-3 md:py-3.5 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-colors text-sm md:text-base"
                                >
                                    {formData.id ? '수정하기' : '등록하기'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative">

                            {(notices.length > 0 || (isLoading && page === 0)) && (
                                <div className="absolute top-2 bottom-2 left-[12px] md:left-[21px] w-[2px] bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-full"></div>
                            )}

                            <div className="space-y-6 md:space-y-8 pb-10 md:pb-0">
                                {isLoading && page === 0 ? (
                                    Array.from({ length: 3 }).map((_, idx) => (
                                        <div key={`skeleton-${idx}`} className="relative pl-8 md:pl-16 group animate-pulse">
                                            <div className="absolute left-0 md:left-[7px] top-4 md:top-6 w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/10 border border-white/5"></div>
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
                                    <div className="text-center py-20 text-gray-500 font-bold">
                                        등록된 공지사항이 없습니다.
                                    </div>
                                ) : (
                                    notices.map((notice) => {
                                        const config = getTypeConfig(notice.type);
                                        const NodeIcon = config.NodeIcon;

                                        return (
                                            <div key={notice.id} className="relative pl-8 md:pl-16 group">
                                                <div className="absolute left-0 md:left-[7px] top-4 md:top-5 w-6 h-6 md:w-7 md:h-7 rounded-full bg-ps-black border border-white/20 flex items-center justify-center z-10 shadow-[0_0_10px_rgba(0,0,0,1)] group-hover:scale-125 group-hover:border-white/50 transition-all duration-300">
                                                    <NodeIcon className={`w-3 h-3 md:w-3.5 md:h-3.5 ${config.color} ${config.nodeStyle} ${config.glow}`} />
                                                </div>

                                                <div className="bg-[#151515] md:bg-black/40 border border-white/5 hover:border-white/20 rounded-2xl p-4 md:p-6 md:backdrop-blur-md transition-all shadow-xl group-hover:shadow-2xl group-hover:-translate-y-0.5 relative group/card">

                                                    {isAdmin && (
                                                        <div className="absolute top-3 md:top-4 right-3 md:right-4 flex items-center gap-1.5 opacity-100 md:opacity-30 group-hover/card:opacity-100 transition-opacity z-20 bg-[#151515] md:bg-transparent pl-2 rounded-l-md">
                                                            <button onClick={() => handleEditClick(notice)} className="p-1.5 bg-blue-500/10 hover:bg-blue-500/30 text-blue-400 rounded-md transition-colors" title="수정">
                                                                <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                            </button>
                                                            <button onClick={() => handleDelete(notice.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/30 text-red-500 rounded-md transition-colors" title="삭제">
                                                                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className={`flex flex-wrap justify-between items-center gap-3 mb-3 md:mb-4 ${isAdmin ? 'pr-16' : ''}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-md text-[10px] md:text-xs font-bold border ${config.bg} ${config.color} ${config.border}`}>
                                                                {config.icon} {config.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 md:gap-1.5 text-gray-500 text-[10px] md:text-xs font-bold">
                                                            <CalendarDays className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                                            {formatDate(notice.createdAt)}
                                                        </div>
                                                    </div>

                                                    <h3 className="text-base md:text-xl font-bold text-white mb-3 md:mb-5 tracking-tight transition-colors leading-snug">
                                                        {notice.title}
                                                    </h3>

                                                    <SmartTextRenderer content={notice.content} config={config} />

                                                </div>
                                            </div>
                                        );
                                    })
                                )}

                                {!isLoading && hasMore && notices.length > 0 && (
                                    <div ref={observerTarget} className="h-4 w-full" />
                                )}

                                {isLoading && page > 0 && (
                                    <div className="flex justify-center py-6">
                                        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                                    </div>
                                )}

                                {!isLoading && !hasMore && notices.length > 0 && (
                                    <div className="py-10 md:py-12 text-center flex flex-col items-center gap-3 opacity-50 border-t border-white/5 mt-6 md:mt-10">
                                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gray-500"></div>
                                        <p className="text-gray-400 font-bold text-xs md:text-sm">모든 공지사항을 확인하셨습니다</p>
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