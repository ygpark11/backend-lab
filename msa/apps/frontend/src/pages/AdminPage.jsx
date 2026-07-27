import React, { useState, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    AlertTriangle, Circle, CheckSquare, Edit3, Plus, RefreshCw,
    RotateCcw, Search, Square, Trash2, Triangle, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import {
    bulkDeleteGames, registerGame, updateGame, getAdminGameDetail,
    getScrapingRequests, retryScrapingRequest, refreshSingleGame
} from '../api/admin';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTransitionNavigate } from '../hooks/useTransitionNavigate';

// ─── 상수 ────────────────────────────────────────────────────────────────────

const STATUS_META = {
    PENDING:    { label: '대기중',  color: 'text-secondary bg-surface border-divider' },
    PROCESSING: { label: '수집중',  color: 'text-ps-blue bg-blue-500/10 border-blue-500/30' },
    COMPLETED:  { label: '완료',    color: 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/30' },
    FAILED:     { label: '실패',    color: 'text-red-500 bg-red-500/10 border-red-500/30' },
};

// ─── 하위 컴포넌트 ────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-surface border border-divider rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-ps-blue transition-colors';

function FormField({ label, value, onChange, numeric = false, placeholder = '' }) {
    return (
        <div>
            <label className="block text-xs font-bold text-secondary mb-1">{label}</label>
            <input
                type="text"
                inputMode={numeric ? 'decimal' : 'text'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={inputCls}
            />
        </div>
    );
}

function StatusBadge({ status }) {
    const meta = STATUS_META[status] ?? { label: status, color: 'text-secondary bg-surface border-divider' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${meta.color}`}>
            {meta.label}
        </span>
    );
}

function EditModal({ game, onClose, onSaved }) {
    const src = game.searchKeywords ?? [];
    const [form, setForm] = useState({
        name: game.name ?? '',
        englishName: game.englishName ?? '',
        imageUrl: game.imageUrl ?? '',
        igdbCriticScore: game.igdbCriticScore ?? '',
        igdbCriticCount: game.igdbCriticCount ?? '',
        igdbUserScore: game.igdbUserScore ?? '',
        igdbUserCount: game.igdbUserCount ?? '',
        mcMetaScore: game.mcMetaScore ?? '',
        mcMetaCount: game.mcMetaCount ?? '',
        mcUserScore: game.mcUserScore ?? '',
        mcUserCount: game.mcUserCount ?? '',
        keywords: Array.from({ length: 5 }, (_, i) => src[i] ?? ''),
        hltbMainStory: game.hltbMainStory ?? '',
        hltbMainExtra: game.hltbMainExtra ?? '',
        hltbCompletionist: game.hltbCompletionist ?? '',
    });
    const [saving, setSaving] = useState(false);

    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
    const setKeyword = (i) => (e) => setForm(f => {
        const next = [...f.keywords];
        next[i] = e.target.value;
        return { ...f, keywords: next };
    });

    const handleSave = async () => {
        setSaving(true);
        try {
            const num = (v) => v !== '' ? Number(v) : null;
            const payload = {
                name: form.name || null,
                englishName: form.englishName || null,
                imageUrl: form.imageUrl || null,
                igdbCriticScore: num(form.igdbCriticScore),
                igdbCriticCount: num(form.igdbCriticCount),
                igdbUserScore: num(form.igdbUserScore),
                igdbUserCount: num(form.igdbUserCount),
                mcMetaScore: num(form.mcMetaScore),
                mcMetaCount: num(form.mcMetaCount),
                mcUserScore: num(form.mcUserScore),
                mcUserCount: num(form.mcUserCount),
                hltbMainStory: num(form.hltbMainStory),
                hltbMainExtra: num(form.hltbMainExtra),
                hltbCompletionist: num(form.hltbCompletionist),
            };
            const filledKeywords = form.keywords.map(k => k.trim()).filter(Boolean);
            if (filledKeywords.length > 0) payload.searchKeywords = filledKeywords;

            await updateGame(game.id, payload);
            toast.success('게임 정보가 수정되었습니다.');
            onSaved();
            onClose();
        } catch (e) {
            toast.error(e.response?.data?.message ?? '수정에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };


    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-backdrop">
            <div className="bg-base border border-divider rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-divider shrink-0">
                    <div>
                        <h2 className="text-base font-black text-primary">게임 정보 수정</h2>
                        <p className="text-xs text-muted mt-0.5 line-clamp-1">{game.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
                        <X className="w-5 h-5 text-secondary" />
                    </button>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-5">
                    {/* 기본 정보 */}
                    <div>
                        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">기본 정보</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FormField label="한국어 타이틀" value={form.name} onChange={set('name')} />
                            <FormField label="영어 타이틀" value={form.englishName} onChange={set('englishName')} />
                            <div className="sm:col-span-2">
                                <FormField label="이미지 URL" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://..." />
                            </div>
                        </div>
                    </div>

                    {/* IGDB 평점 */}
                    <div>
                        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">IGDB 평점</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <FormField label="비평가 점수" value={form.igdbCriticScore} onChange={set('igdbCriticScore')} numeric />
                            <FormField label="비평가 수" value={form.igdbCriticCount} onChange={set('igdbCriticCount')} numeric />
                            <FormField label="유저 점수" value={form.igdbUserScore} onChange={set('igdbUserScore')} numeric />
                            <FormField label="유저 수" value={form.igdbUserCount} onChange={set('igdbUserCount')} numeric />
                        </div>
                    </div>

                    {/* 메타크리틱 평점 */}
                    <div>
                        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Metacritic 평점</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <FormField label="메타 점수" value={form.mcMetaScore} onChange={set('mcMetaScore')} numeric />
                            <FormField label="비평가 수" value={form.mcMetaCount} onChange={set('mcMetaCount')} numeric />
                            <FormField label="유저 점수" value={form.mcUserScore} onChange={set('mcUserScore')} numeric />
                            <FormField label="유저 수" value={form.mcUserCount} onChange={set('mcUserCount')} numeric />
                        </div>
                    </div>

                    {/* HLTB */}
                    <div>
                        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">HLTB 플레이타임 (시간)</p>
                        <div className="grid grid-cols-3 gap-3">
                            <FormField label="메인 스토리" value={form.hltbMainStory} onChange={set('hltbMainStory')} numeric />
                            <FormField label="메인+엑스트라" value={form.hltbMainExtra} onChange={set('hltbMainExtra')} numeric />
                            <FormField label="컴플리셔니스트" value={form.hltbCompletionist} onChange={set('hltbCompletionist')} numeric />
                        </div>
                    </div>

                    {/* 검색 키워드 */}
                    <div>
                        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">검색 키워드</p>
                        <div className="grid grid-cols-5 gap-2">
                            {form.keywords.map((kw, i) => (
                                <div key={i}>
                                    <label className="block text-xs font-bold text-secondary mb-1">#{i + 1}</label>
                                    <input
                                        type="text"
                                        value={kw}
                                        onChange={setKeyword(i)}
                                        placeholder={i === 0 ? 'p5r' : i === 1 ? '페르소나5' : ''}
                                        className={inputCls}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-divider flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-secondary hover:bg-surface-hover border border-divider transition-colors">
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 rounded-xl text-sm font-bold bg-ps-blue text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                        {saving ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function RegisterModal({ onClose, onRegistered }) {
    const [psStoreId, setPsStoreId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        const trimmed = psStoreId.trim();
        if (!trimmed) { toast.error('psStoreId를 입력하세요.'); return; }
        setLoading(true);
        try {
            await registerGame(trimmed);
            toast.success('수집 대기열에 등록됐습니다. 수집 현황 탭에서 확인하세요.');
            onRegistered?.();
            onClose();
        } catch (e) {
            toast.error(e.response?.data?.message ?? '등록에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-backdrop">
            <div className="bg-base border border-divider rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
                    <h2 className="text-base font-black text-primary">게임 등록</h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
                        <X className="w-5 h-5 text-secondary" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-secondary mb-1">PS Store ID</label>
                        <input
                            type="text"
                            value={psStoreId}
                            onChange={e => setPsStoreId(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleRegister()}
                            placeholder="예: HP0700-PPSA10593_00-TEKKEN"
                            className="w-full bg-surface border border-divider rounded-lg px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-ps-blue transition-colors"
                            autoFocus
                        />
                        <p className="text-[11px] text-muted mt-1.5">
                            PS Store 상품 URL의 마지막 경로 값을 입력하세요.<br />
                            기존 파이프라인을 통해 자동 수집됩니다. 완료 시 FCM 알림 전송.
                        </p>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-divider flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-secondary hover:bg-surface-hover border border-divider transition-colors">
                        취소
                    </button>
                    <button
                        onClick={handleRegister}
                        disabled={loading || !psStoreId.trim()}
                        className="px-5 py-2 rounded-xl text-sm font-bold bg-ps-blue text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                        {loading ? '등록 중...' : '등록'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── 탭: 게임 관리 ────────────────────────────────────────────────────────────

function GameManagementTab() {
    const [keyword, setKeyword] = useState('');
    const [games, setGames] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [editGame, setEditGame] = useState(null);
    const [editLoadingId, setEditLoadingId] = useState(null);
    const [showRegister, setShowRegister] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const search = useCallback(async (p = 0) => {
        setLoading(true);
        setSelected(new Set());
        try {
            const res = await client.get('/api/v1/games/search', {
                params: { keyword: keyword.trim() || undefined, page: p, size: 20 }
            });
            setGames(res.data.content ?? []);
            setTotalPages(res.data.totalPages ?? 0);
            setPage(p);
        } catch {
            toast.error('게임 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [keyword]);

    const toggleSelect = (id) => setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const toggleAll = () => {
        if (selected.size === games.length) setSelected(new Set());
        else setSelected(new Set(games.map(g => g.id)));
    };

    const handleBulkDelete = () => {
        if (selected.size === 0) return;
        toast((t) => (
            <div className="flex flex-col gap-4 min-w-[280px] bg-base border border-divider text-primary p-4 shadow-2xl rounded-2xl">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/10 p-2 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <p className="font-bold text-sm">게임 {selected.size}개를 삭제하시겠습니까?</p>
                        <p className="text-[11px] text-secondary mt-0.5">관련 가격 이력, 위시리스트가 함께 삭제됩니다.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            toast.dismiss(t.id);
                            setDeleting(true);
                            try {
                                await bulkDeleteGames([...selected]);
                                toast.success(`${selected.size}개 게임이 삭제되었습니다.`);
                                search(page);
                            } catch (e) {
                                toast.error(e.response?.data?.message ?? '삭제에 실패했습니다.');
                            } finally {
                                setDeleting(false);
                            }
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all"
                    >
                        삭제
                    </button>
                    <button onClick={() => toast.dismiss(t.id)} className="flex-1 bg-base hover:bg-surface-hover text-secondary py-2.5 rounded-xl text-xs font-bold border border-divider transition-colors">
                        취소
                    </button>
                </div>
            </div>
        ), { duration: 8000, position: 'top-center' });
    };

    return (
        <div className="space-y-4">
            {/* 검색 바 + 등록 버튼 */}
            <div className="flex gap-3">
                <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input
                            type="text"
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && search(0)}
                            placeholder="게임 검색..."
                            className="w-full bg-surface border border-divider rounded-xl pl-9 pr-4 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-ps-blue transition-colors"
                        />
                    </div>
                    <button
                        onClick={() => search(0)}
                        disabled={loading}
                        className="px-5 py-2.5 bg-ps-blue text-white rounded-xl text-sm font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                        검색
                    </button>
                </div>
                <button
                    onClick={() => setShowRegister(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bento-green-from)] border border-[color:var(--bento-green-border)] hover:border-[color:var(--bento-green-border-hover)] text-green-600 dark:text-green-400 rounded-xl text-sm font-bold transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> 등록
                </button>
            </div>

            {/* 선택 액션 바 */}
            {selected.size > 0 && (
                <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <span className="text-sm font-bold text-red-500">{selected.size}개 선택됨</span>
                    <button
                        onClick={handleBulkDelete}
                        disabled={deleting}
                        className="flex items-center gap-1.5 text-sm font-bold text-red-500 hover:text-red-400 disabled:opacity-50 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" /> 선택 삭제
                    </button>
                </div>
            )}

            {/* 게임 테이블 */}
            {games.length > 0 ? (
                <div className="bg-surface border border-divider rounded-xl overflow-hidden">
                    {/* 헤더 */}
                    <div className="grid grid-cols-[40px_1fr_80px_90px_80px] gap-3 px-4 py-2.5 border-b border-divider bg-surface/80">
                        <button onClick={toggleAll} className="flex items-center justify-center text-secondary hover:text-primary transition-colors">
                            {selected.size === games.length && games.length > 0
                                ? <CheckSquare className="w-4 h-4 text-ps-blue" />
                                : <Square className="w-4 h-4" />}
                        </button>
                        <span className="text-xs font-bold text-muted uppercase tracking-wider">게임명</span>
                        <span className="text-xs font-bold text-muted uppercase tracking-wider text-right">할인율</span>
                        <span className="text-xs font-bold text-muted uppercase tracking-wider text-right">현재가</span>
                        <span className="text-xs font-bold text-muted uppercase tracking-wider text-right">작업</span>
                    </div>

                    {/* 행 */}
                    {games.map(game => (
                        <div
                            key={game.id}
                            className={`grid grid-cols-[40px_1fr_80px_90px_80px] gap-3 px-4 py-3 border-b border-divider last:border-0 items-center transition-colors ${selected.has(game.id) ? 'bg-ps-blue/5' : 'hover:bg-surface-hover'}`}
                        >
                            <button
                                onClick={() => toggleSelect(game.id)}
                                className="flex items-center justify-center text-secondary hover:text-primary transition-colors"
                            >
                                {selected.has(game.id)
                                    ? <CheckSquare className="w-4 h-4 text-ps-blue" />
                                    : <Square className="w-4 h-4" />}
                            </button>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-primary line-clamp-1">{game.name}</p>
                                <p className="text-[11px] text-muted line-clamp-1">{game.psStoreId ?? game.id}</p>
                            </div>
                            <p className="text-sm font-black text-right text-orange-500">
                                {game.discountRate > 0 ? `-${game.discountRate}%` : '—'}
                            </p>
                            <p className="text-sm font-black text-right text-primary">
                                {game.price?.toLocaleString('ko-KR') ?? '—'}원
                            </p>
                            <div className="flex justify-end gap-1">
                                <button
                                    onClick={async () => {
                                        setEditLoadingId(game.id);
                                        try {
                                            const res = await getAdminGameDetail(game.id);
                                            const d = res.data;
                                            setEditGame({
                                                id: d.id,
                                                name: d.name ?? '',
                                                englishName: d.englishName ?? '',
                                                imageUrl: d.imageUrl ?? '',
                                                igdbCriticScore: d.igdbCriticScore ?? '',
                                                igdbCriticCount: d.igdbCriticCount ?? '',
                                                igdbUserScore: d.igdbUserScore ?? '',
                                                igdbUserCount: d.igdbUserCount ?? '',
                                                mcMetaScore: d.mcMetaScore ?? '',
                                                mcMetaCount: d.mcMetaCount ?? '',
                                                mcUserScore: d.mcUserScore ?? '',
                                                mcUserCount: d.mcUserCount ?? '',
                                                hltbMainStory: d.hltbMainStory ?? '',
                                                hltbMainExtra: d.hltbMainExtra ?? '',
                                                hltbCompletionist: d.hltbCompletionist ?? '',
                                                searchKeywords: d.searchKeywords ?? [],
                                            });
                                        } catch {
                                            toast.error('게임 정보를 불러오지 못했습니다.');
                                        } finally {
                                            setEditLoadingId(null);
                                        }
                                    }}
                                    disabled={editLoadingId === game.id}
                                    title="수정"
                                    className="p-1.5 text-secondary hover:text-ps-blue hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {editLoadingId === game.id
                                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                                        : <Edit3 className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            await refreshSingleGame(game.id);
                                            toast.success('재수집 요청 완료');
                                        } catch {
                                            toast.error('재수집 요청 실패');
                                        }
                                    }}
                                    title="재수집"
                                    className="p-1.5 text-secondary hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center">
                    <Search className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-bold text-muted">검색어를 입력하고 게임을 찾아보세요.</p>
                </div>
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button onClick={() => search(page - 1)} disabled={page === 0 || loading} className="p-2 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg disabled:opacity-40 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-bold text-secondary">{page + 1} / {totalPages}</span>
                    <button onClick={() => search(page + 1)} disabled={page >= totalPages - 1 || loading} className="p-2 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg disabled:opacity-40 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {editGame && <EditModal game={editGame} onClose={() => setEditGame(null)} onSaved={() => search(page)} />}
            {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onRegistered={() => {}} />}
        </div>
    );
}

// ─── 탭: 수집 현황 ────────────────────────────────────────────────────────────

function ScrapingQueueTab() {
    const [requests, setRequests] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [retrying, setRetrying] = useState(null);

    const fetchRequests = useCallback(async (p = 0) => {
        setLoading(true);
        try {
            const res = await getScrapingRequests(p, 20);
            setRequests(res.data.content ?? []);
            setTotalPages(res.data.totalPages ?? 0);
            setPage(p);
        } catch {
            toast.error('수집 현황을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleRetry = async (requestId) => {
        setRetrying(requestId);
        try {
            await retryScrapingRequest(requestId);
            toast.success('재수집 요청이 등록됐습니다.');
            fetchRequests(page);
        } catch (e) {
            toast.error(e.response?.data?.message ?? '재시도에 실패했습니다.');
        } finally {
            setRetrying(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={() => fetchRequests(0)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-divider rounded-xl text-sm font-bold text-secondary hover:text-primary transition-colors active:scale-95 disabled:opacity-50"
                >
                    <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
                </button>
            </div>

            {loading && requests.length === 0 ? (
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-surface border border-divider rounded-xl px-4 py-3.5 animate-pulse">
                            <div className="h-4 bg-surface-hover rounded w-1/3 mb-2" />
                            <div className="h-3 bg-surface-hover rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <div className="py-20 text-center">
                    <Circle className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-bold text-muted">수집 요청 내역이 없습니다.</p>
                    <p className="text-xs text-muted mt-1">새로고침을 눌러 불러오세요.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {requests.map(req => (
                        <div
                            key={req.id}
                            className={`bg-surface border rounded-xl px-4 py-3.5 flex items-start gap-4 transition-colors ${req.status === 'FAILED' ? 'border-red-500/30' : 'border-divider'}`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <StatusBadge status={req.status} />
                                    <span className="text-sm font-bold text-primary line-clamp-1">{req.psStoreId}</span>
                                </div>
                                <p className="text-xs text-muted mt-1">요청자: {req.memberNickname}</p>
                                {req.errorMessage && (
                                    <p className="text-xs text-red-500 mt-1 line-clamp-2 break-all">{req.errorMessage}</p>
                                )}
                                <p className="text-[11px] text-muted mt-1.5">
                                    {new Date(req.createdAt).toLocaleString('ko-KR')}
                                </p>
                            </div>
                            {req.status === 'FAILED' && (
                                <button
                                    onClick={() => handleRetry(req.id)}
                                    disabled={retrying === req.id}
                                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bento-red-from)] border border-[color:var(--bento-red-border)] text-red-500 rounded-lg text-xs font-bold hover:border-[color:var(--bento-red-border-hover)] transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <RotateCcw className={`w-3.5 h-3.5 ${retrying === req.id ? 'animate-spin' : ''}`} />
                                    재시도
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button onClick={() => fetchRequests(page - 1)} disabled={page === 0 || loading} className="p-2 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg disabled:opacity-40 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-bold text-secondary">{page + 1} / {totalPages}</span>
                    <button onClick={() => fetchRequests(page + 1)} disabled={page >= totalPages - 1 || loading} className="p-2 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg disabled:opacity-40 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────────────

const TABS = [
    { key: 'games', label: '게임 관리' },
    { key: 'scraping', label: '수집 현황' },
];

export default function AdminPage() {
    const { isAdmin, loading } = useCurrentUser();
    const navigate = useTransitionNavigate();
    const [activeTab, setActiveTab] = useState('games');

    if (loading) return null;
    if (!isAdmin) {
        navigate('/games');
        return null;
    }

    return (
        <>
            <Helmet>
                <title>관리자 콘솔 — PS Tracker</title>
            </Helmet>

            <div className="relative min-h-screen pb-20">
                {/* PS 워터마크 */}
                <div className="absolute top-20 right-10 pointer-events-none flex gap-8 rotate-12 scale-150 opacity-[0.02] dark:opacity-[0.03] text-primary">
                    <Triangle className="w-40 h-40 stroke-[2px]" />
                    <Circle className="w-40 h-40 stroke-[2px]" />
                    <X className="w-40 h-40 stroke-[2px]" />
                    <Square className="w-40 h-40 stroke-[2px]" />
                </div>

                <div className="max-w-4xl mx-auto px-4 pt-8">
                    {/* 헤더 */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-black text-primary tracking-tighter">관리자 콘솔</h1>
                        <p className="text-sm text-muted mt-1">게임 등록·수정·삭제 및 수집 파이프라인 현황을 관리합니다.</p>
                    </div>

                    {/* 탭 */}
                    <div className="flex gap-1 bg-surface border border-divider rounded-xl p-1 mb-6 w-fit">
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                                    activeTab === tab.key
                                        ? 'bg-base text-primary shadow-sm border border-divider'
                                        : 'text-secondary hover:text-primary'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* 탭 콘텐츠 */}
                    {activeTab === 'games' ? <GameManagementTab /> : <ScrapingQueueTab />}
                </div>
            </div>
        </>
    );
}
