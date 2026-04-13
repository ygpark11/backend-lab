import React, {useCallback, useEffect, useState} from 'react';
import {
    Award, Bell, CheckCircle2, Circle, Copy, Crown, Edit3, Gamepad2, Loader2,
    Lock, Mail, Medal, MessageSquare, Moon, Pickaxe, Settings, Shield,
    Square, Sun, Triangle, Trophy, X as XIcon, Zap
} from 'lucide-react';
import PSGameImage from '../components/common/PSGameImage';
import client from '../api/client';
import toast from 'react-hot-toast';
import {useLocation} from 'react-router-dom';
import {useTransitionNavigate} from '../hooks/useTransitionNavigate';

export default function MyPage() {
    const navigate = useTransitionNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('trophies');
    const [isLoading, setIsLoading] = useState(true);

    const [profile, setProfile] = useState(null);
    const [pioneeredGames, setPioneeredGames] = useState([]);
    const [settings, setSettings] = useState({ priceAlert: true, nightMode: false });

    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [editNicknameValue, setEditNicknameValue] = useState('');

    const handleContactClick = useCallback((e) => {
        e.preventDefault();
        const email = 'pstracker.help@gmail.com';

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(email).then(() => {
                toast.success('이메일 복사 완료! (메일 앱이 안 열리면 직접 붙여넣어 주세요)', { duration: 4000 });
            }).catch(() => {
                toast.success('이메일 복사 완료! (메일 앱이 안 열리면 직접 붙여넣어 주세요)', { duration: 4000 });
            });
        } else {
            toast.success('이메일 복사 완료! (메일 앱이 안 열리면 직접 붙여넣어 주세요)', { duration: 4000 });
        }

        setTimeout(() => {
            window.location.href = `mailto:${email}`;
        }, 500);
    }, []);

    useEffect(() => {
        const fetchMyPageData = async () => {
            setIsLoading(true);
            try {
                const [profileRes, gamesRes, settingsRes] = await Promise.all([
                    client.get('/api/v1/members/me/profile'),
                    client.get('/api/v1/members/me/pioneered'),
                    client.get('/api/v1/members/me/settings')
                ]);

                setProfile(profileRes.data);
                setPioneeredGames(gamesRes.data);
                setSettings(settingsRes.data);
            } catch (error) {
                console.error("마이페이지 데이터 로딩 실패:", error);
                toast.error("데이터를 불러오지 못했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyPageData();
    }, []);

    const handleToggleSetting = async (key) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);

        try {
            await client.put('/api/v1/members/me/settings', newSettings);
            if (key === 'nightMode') {
                toast.custom((t) => (
                    <div className={`w-max mx-auto bg-surface border border-divider shadow-lg rounded-full px-5 py-3 flex items-center gap-3 transition-all ${t.visible ? 'animate-fadeIn' : 'animate-fadeOut'}`}>
                        {newSettings.nightMode ? (
                            <Moon className="w-5 h-5 text-purple-500" />
                        ) : (
                            <Sun className="w-5 h-5 text-orange-500" />
                        )}
                        <span className="font-bold text-sm text-primary">
                            {newSettings.nightMode ? '야간 스텔스 모드 활성화' : '야간 알림 무음 해제'}
                        </span>
                    </div>
                ), { duration: 3000, position: 'top-center' });
            }
        } catch (error) {
            setSettings(settings); // 롤백
            toast.error("설정 변경에 실패했습니다.");
        }
    };

    const handleUpdateNickname = async () => {
        const newNickname = editNicknameValue.trim();
        if (!newNickname) return toast.error("닉네임을 입력해주세요.");
        if (newNickname === profile.nickname) return setIsEditingNickname(false);

        const toastId = toast.loading("닉네임 변경 중...");
        try {
            const res = await client.put('/api/v1/members/me/nickname', { nickname: newNickname });
            setProfile({ ...profile, nickname: res.data });
            setIsEditingNickname(false);
            toast.success("닉네임이 성공적으로 변경되었습니다!", { id: toastId });
        } catch (error) {
            toast.error(error.response?.data || "닉네임 변경에 실패했습니다.", { id: toastId });
        }
    };

    const getTrophyStyle = (tier) => {
        switch (tier) {
            case 'PLATINUM': return { icon: Crown, color: 'text-[#0284c7] dark:text-[#38bdf8]', bgClass: 'bg-[#38bdf8]/10', borderClass: 'border-[#38bdf8]/30', glowClass: 'shadow-md dark:shadow-[0_0_30px_rgba(56,189,248,0.2)]' };
            case 'GOLD': return { icon: Trophy, color: 'text-[#d97706] dark:text-[#fbbf24]', bgClass: 'bg-[#fbbf24]/10', borderClass: 'border-[#fbbf24]/30', glowClass: 'shadow-md dark:shadow-[0_0_30px_rgba(251,191,36,0.2)]' };
            case 'SILVER': return { icon: Medal, color: 'text-gray-500 dark:text-[#e2e8f0]', bgClass: 'bg-gray-500/10 dark:bg-[#e2e8f0]/10', borderClass: 'border-gray-400/30 dark:border-[#e2e8f0]/30', glowClass: 'shadow-sm dark:shadow-[0_0_30px_rgba(156,163,175,0.2)]' };
            case 'BRONZE': return { icon: Award, color: 'text-[#c2410c] dark:text-[#f97316]', bgClass: 'bg-[#f97316]/10', borderClass: 'border-[#f97316]/30', glowClass: 'shadow-sm dark:shadow-[0_0_30px_rgba(249,115,22,0.2)]' };
            default: return { icon: Lock, color: 'text-muted', bgClass: 'bg-surface', borderClass: 'border-divider', glowClass: 'shadow-sm' };
        }
    };

    const getTrophyTitle = (type, currentValue) => {
        switch (type) {
            case 'PIONEER': return { title: '개척자의 증명', desc: `새로운 데이터를 수집한 횟수 (현재: ${currentValue}회)` };
            case 'VOTE': return { title: '네온시티 평론가', desc: `커뮤니티 평가에 참여한 횟수 (현재: ${currentValue}회)` };
            case 'TIME': return { title: '생존자', desc: `PS Tracker 합류 후 경과 일수 (현재: ${currentValue}일)` };
            default: return { title: '알 수 없음', desc: '' };
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-base transition-colors duration-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-ps-blue" />
                <p className="font-bold tracking-widest text-sm animate-pulse text-secondary">SYNCING TERMINAL...</p>
            </div>
        );
    }

    const highestTrophy = profile?.trophies.find(t => t.unlocked && t.tier === 'PLATINUM') ||
        profile?.trophies.find(t => t.unlocked && t.tier === 'GOLD') ||
        profile?.trophies.find(t => t.unlocked && t.tier === 'SILVER') ||
        profile?.trophies.find(t => t.unlocked && t.tier === 'BRONZE');

    const avatarStyle = highestTrophy ? getTrophyStyle(highestTrophy.tier) : getTrophyStyle('DEFAULT');
    const AvatarIcon = avatarStyle.icon;

    return (
        <div className="min-h-screen p-4 sm:p-8 pt-20 sm:pt-24 relative overflow-hidden bg-base text-primary transition-colors duration-500">
            <div className="hidden md:block absolute top-0 left-1/4 w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none bg-transparent dark:bg-ps-blue/10 transition-colors duration-500"></div>
            <div className="hidden md:block absolute bottom-0 right-1/4 w-[30%] h-[50%] rounded-full blur-[120px] pointer-events-none bg-transparent dark:bg-pink-500/05 transition-colors duration-500"></div>

            <div className="max-w-4xl mx-auto relative z-10">

                <div className="relative p-5 sm:p-8 rounded-2xl border backdrop-blur-md mb-6 overflow-hidden group transition-all duration-500 bg-glass border-divider shadow-xl mt-4">
                    {/* 최고 업적 기반 배경 오로라 */}
                    {highestTrophy && <div className={`absolute inset-0 opacity-0 dark:opacity-10 group-hover:dark:opacity-20 transition-opacity duration-700 blur-3xl ${avatarStyle.bgClass}`}></div>}

                    <div className="absolute -right-10 -bottom-10 pointer-events-none flex gap-4 rotate-12 scale-150 opacity-[0.02] text-primary">
                        <Triangle className="w-24 h-24 stroke-[2px]" />
                        <Circle className="w-24 h-24 stroke-[2px]" />
                        <XIcon className="w-24 h-24 stroke-[2px]" />
                        <Square className="w-24 h-24 stroke-[2px]" />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                        {/* 아바타 링 */}
                        <div className={`w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-full p-1 border flex items-center justify-center relative transition-all duration-500 bg-surface ${avatarStyle.borderClass} ${avatarStyle.glowClass}`}>
                            <div className="absolute inset-1 rounded-full border border-dashed animate-spin-slow pointer-events-none border-primary/10"></div>
                            <AvatarIcon className={`w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md ${avatarStyle.color}`} />
                            <div className="absolute -bottom-1 -right-1 bg-primary text-[color:var(--color-bg-base)] text-[10px] font-black px-2.5 py-0.5 rounded-md shadow-md">
                                Lv.{profile.level}
                            </div>
                        </div>

                        <div className="flex-1 text-center sm:text-left w-full">
                            <h2 className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase mb-1.5 flex items-center justify-center sm:justify-start gap-1.5 text-secondary">
                                <Shield className="w-3.5 h-3.5 text-ps-blue" /> PS Tracker Operative
                            </h2>

                            <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
                                {isEditingNickname ? (
                                    <div className="flex items-center gap-2 animate-fadeIn">
                                        <input
                                            type="text"
                                            value={editNicknameValue}
                                            onChange={(e) => setEditNicknameValue(e.target.value)}
                                            maxLength={10}
                                            className="border px-3 py-1 rounded-lg outline-none focus:ring-2 focus:ring-ps-blue/50 text-xl sm:text-2xl font-black w-32 sm:w-48 transition-all bg-base border-ps-blue text-primary shadow-inner"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                                    handleUpdateNickname();
                                                }
                                            }}
                                        />
                                        <button onClick={handleUpdateNickname} className="p-1.5 bg-[#166534]/30 text-[#4ade80] hover:bg-[#166534]/50 rounded-md transition-colors border border-[#4ade80]/30">
                                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </button>
                                        <button onClick={() => setIsEditingNickname(false)} className="p-1.5 bg-[#991b1b]/30 text-[#f87171] hover:bg-[#991b1b]/50 rounded-md transition-colors border border-[#f87171]/30">
                                            <XIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-2xl sm:text-4xl font-black tracking-tight drop-shadow-md text-primary">
                                            {profile.nickname}
                                        </h1>
                                        <button
                                            onClick={() => {
                                                setEditNicknameValue(profile.nickname);
                                                setIsEditingNickname(true);
                                            }}
                                            className="p-1.5 rounded-md transition-colors border group bg-surface hover:bg-surface-hover border-divider-strong"
                                        >
                                            <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 transition-colors text-secondary group-hover:text-primary" />
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 w-full">
                                {[
                                    { icon: Triangle, textClass: 'text-[#00A39D]', bgClass: 'bg-[#00A39D]/05', label: '절약 대기', value: `₩${(profile.totalSavedAmount / 1000).toFixed(0)}K`, valSize: 'text-sm sm:text-lg' },
                                    { icon: XIcon, textClass: 'text-[#4E6CBB]', bgClass: 'bg-[#4E6CBB]/05', label: '발굴 데이터', value: `${profile.pioneeredCount}EA`, valSize: 'text-sm sm:text-lg' },
                                    { icon: Square, textClass: 'text-[#E8789C]', bgClass: 'bg-[#E8789C]/05', label: '합류 일자', value: profile.joinDate.replace(/-/g, '.').substring(2), valSize: 'text-xs sm:text-base mt-auto sm:mt-0' }
                                ].map((stat, i) => (
                                    <div key={i} className="p-2 sm:p-3 rounded-lg flex flex-col items-center sm:items-start relative overflow-hidden group transition-colors duration-300 border shadow-sm bg-surface border-divider hover:border-divider-strong">
                                        <div className={`absolute -bottom-4 -right-4 w-14 h-14 rounded-full blur-xl ${stat.bgClass} opacity-0 dark:opacity-80 group-hover:dark:opacity-100 transition-opacity`}></div>
                                        <stat.icon className={`absolute -bottom-2 -right-2 w-10 h-10 stroke-[3px] transition-colors opacity-10 dark:opacity-30 ${stat.textClass}`} />

                                        <p className="text-secondary text-[9px] sm:text-[10px] font-bold uppercase mb-1 whitespace-nowrap relative z-10">{stat.label}</p>
                                        <p className={`${stat.valSize} ${stat.textClass} font-black tracking-tight relative z-10 drop-shadow-sm`}>{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 탭 메뉴 */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 snap-x px-1 -mx-1 [&::-webkit-scrollbar]:hidden">
                    {[
                        { id: 'trophies', label: '나의 업적', icon: Trophy },
                        { id: 'logs', label: '발굴 일지', icon: Gamepad2 },
                        { id: 'settings', label: '시스템 설정', icon: Settings }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all whitespace-nowrap snap-start shrink-0 border ${
                                activeTab === tab.id
                                    ? 'bg-primary text-[color:var(--color-bg-base)] border-primary shadow-md'
                                    : 'bg-surface text-secondary hover:bg-surface-hover border-divider'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* 탭 콘텐츠 영역 */}
                <div className="min-h-[400px]">
                    {activeTab === 'trophies' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-fadeIn">
                            {profile.trophies.map((trophy, idx) => {
                                const style = getTrophyStyle(trophy.tier);
                                const meta = getTrophyTitle(trophy.type, trophy.currentValue);
                                const Icon = style.icon;

                                return (
                                    <div key={idx} className={`p-4 rounded-xl border transition-all duration-600 flex items-center gap-4 relative overflow-hidden ${
                                        trophy.unlocked
                                            ? `bg-surface border-divider shadow-sm hover:${style.borderClass}`
                                            : 'bg-base border-divider opacity-50 grayscale'
                                    }`}>
                                        {trophy.unlocked && <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl pointer-events-none opacity-0 dark:opacity-20 ${style.bgClass}`}></div>}

                                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 border relative z-10 transition-all duration-600 ${trophy.unlocked ? `${style.bgClass} ${style.borderClass} ${style.glowClass}` : 'bg-surface border-divider shadow-inner'}`}>
                                            <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${style.color} drop-shadow-sm`} />
                                        </div>
                                        <div className="flex-1 min-w-0 relative z-10">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${style.color}`}>{trophy.unlocked ? trophy.tier : 'LOCKED'}</span>
                                            <h3 className="text-sm sm:text-base font-bold mt-0.5 truncate text-primary">{meta.title}</h3>
                                            <p className="text-[10px] sm:text-xs truncate text-secondary">{meta.desc}</p>
                                        </div>
                                        {trophy.unlocked && <CheckCircle2 className="w-4 h-4 text-green-500/50 ml-auto shrink-0 relative z-10" />}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* 발굴 일지 */}
                    {activeTab === 'logs' && (
                        <div className="animate-fadeIn">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-primary">
                                    <Pickaxe className="w-4 h-4 text-ps-blue"/> 내가 발굴한 데이터
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-1 rounded border bg-surface text-secondary border-divider">
                                    Total {pioneeredGames.length}
                                </span>
                            </div>

                            {pioneeredGames.length === 0 ? (
                                <div className="text-center py-10 rounded-xl border bg-surface border-divider">
                                    <Pickaxe className="w-8 h-8 text-secondary mx-auto mb-2" />
                                    <p className="text-sm font-bold text-secondary">아직 발굴한 데이터가 없습니다.</p>
                                </div>
                            ) : (
                                <div className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory px-1 -mx-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-divider-strong">
                                    {pioneeredGames.map(game => (
                                        <div key={game.id} onClick={() => navigate(`/games/${game.id}`, { state: { background: location } })} className="w-[130px] sm:w-[160px] shrink-0 snap-start group cursor-pointer">
                                            <div
                                                className="relative aspect-[3/4] rounded-lg overflow-hidden border shadow-sm mb-2 transition-transform duration-300 group-hover:-translate-y-1 group-hover:border-ps-blue bg-base border-divider"
                                            >
                                                <PSGameImage src={game.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 pointer-events-none"></div>

                                                <div className="absolute top-1.5 right-1.5 bg-glass backdrop-blur-sm p-1 rounded-md border border-divider shadow-sm">
                                                    <Crown className="w-3 h-3 sm:w-3.5 h-3.5 text-yellow-500 drop-shadow-sm" />
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-[11px] sm:text-xs truncate group-hover:text-ps-blue transition-colors text-primary">{game.title}</h4>
                                            <p className="text-[9px] font-medium mt-0.5 text-secondary">발굴: {game.date}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="animate-fadeIn max-w-xl mx-auto sm:mx-0">
                            {/* 설정 제어판 */}
                            <div className="rounded-xl p-4 sm:p-5 mb-6 border transition-colors duration-500 bg-surface border-divider shadow-sm">
                                <h3 className="text-xs font-bold mb-4 flex items-center gap-1.5 uppercase tracking-widest text-secondary">
                                    <Zap className="w-3.5 h-3.5 text-yellow-500"/> 알림 제어판
                                </h3>

                                <div className="space-y-2.5">
                                    {/* 1. 가격 하락 알림 */}
                                    <div className="flex items-center justify-between p-3 rounded-lg border cursor-pointer bg-base border-divider hover:border-divider-strong" onClick={() => handleToggleSetting('priceAlert')}>
                                        <div className="flex items-center gap-3 pr-2">
                                            <div className={`p-1.5 sm:p-2 rounded-md shrink-0 border ${settings.priceAlert ? 'border-transparent bg-[#00A39D]/20' : 'border-divider bg-surface'}`}>
                                                <Bell className={`w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm ${settings.priceAlert ? 'text-[#00A39D]' : 'text-secondary'}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-xs sm:text-sm truncate text-primary">위시리스트 가격 하락 알림</h4>
                                                <p className="text-[9px] sm:text-[10px] mt-0.5 truncate text-secondary">찜한 게임이 할인하면 푸시 수신</p>
                                            </div>
                                        </div>
                                        <div className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full p-0.5 sm:p-1 transition-colors duration-300 shrink-0 ${settings.priceAlert ? 'bg-[#00A39D]' : 'bg-divider-strong'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings.priceAlert ? 'translate-x-5 sm:translate-x-5' : 'translate-x-0'}`}></div>
                                        </div>
                                    </div>

                                    {/* 2. 야간 스텔스 모드 */}
                                    <div className="flex items-center justify-between p-3 rounded-lg border cursor-pointer bg-base border-divider hover:border-divider-strong" onClick={() => handleToggleSetting('nightMode')}>
                                        <div className="flex items-center gap-3 pr-2">
                                            <div className={`p-1.5 sm:p-2 rounded-md shrink-0 border ${settings.nightMode ? 'border-transparent bg-[#E8789C]/20' : 'border-divider bg-surface'}`}>
                                                <Moon className={`w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm ${settings.nightMode ? 'text-[#E8789C]' : 'text-secondary'}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-xs sm:text-sm truncate text-primary">야간 스텔스 모드</h4>
                                                <p className="text-[9px] sm:text-[10px] mt-0.5 truncate text-secondary">22시~08시 사이에는 알림 무음</p>
                                            </div>
                                        </div>
                                        <div className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full p-0.5 sm:p-1 transition-colors duration-300 shrink-0 ${settings.nightMode ? 'bg-[#E8789C]' : 'bg-divider-strong'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings.nightMode ? 'translate-x-5 sm:translate-x-5' : 'translate-x-0'}`}></div>
                                        </div>
                                    </div>

                                    {/* 3. 기기 로그아웃 */}
                                    <div className="flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer group mt-4 bg-base border-divider hover:border-[#FF3E3E]/50 hover:bg-[#FF3E3E]/5"
                                         onClick={async () => {
                                             try { await client.post('/api/v1/auth/logout'); }
                                             catch (error) { console.error("로그아웃 실패:", error); }
                                             finally { localStorage.clear(); window.location.href = '/'; }
                                         }}
                                    >
                                        <div className="flex items-center gap-3 pr-2">
                                            <div className="p-1.5 sm:p-2 rounded-md shrink-0 bg-[#FF3E3E]/10 border border-[#FF3E3E]/20 group-hover:bg-[#FF3E3E]/20 transition-colors">
                                                <Circle className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3px] drop-shadow-sm group-hover:animate-pulse text-[#FF3E3E]" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-xs sm:text-sm truncate text-[#FF3E3E]">기기 로그아웃</h4>
                                                <p className="text-[9px] sm:text-[10px] mt-0.5 truncate text-secondary">현재 브라우저에서 안전하게 연결 해제</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 고객센터 벤토 박스 */}
                            <div className="rounded-2xl border overflow-hidden shadow-sm animate-fadeIn transition-colors duration-500 bg-glass border-divider backdrop-blur-md" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                                <div className="p-4 sm:p-5 border-b flex items-center gap-3 transition-colors duration-500 border-divider bg-surface/50">
                                    <Mail className="w-5 h-5 transition-colors duration-500 text-ps-blue" />
                                    <h3 className="text-sm sm:text-base font-black tracking-wide transition-colors duration-500 text-primary">고객센터 & 제휴 문의</h3>
                                </div>

                                <div className="p-4 sm:p-5 transition-colors duration-500 bg-base">
                                    <div
                                        onClick={handleContactClick}
                                        className="group flex flex-col gap-4 sm:gap-5 border rounded-xl p-4 sm:p-6 cursor-pointer transition-all duration-500 relative overflow-hidden shadow-sm bg-surface hover:bg-surface-hover border-divider hover:border-[color:var(--bento-blue-border-hover)]"
                                    >
                                        <div className="absolute inset-0 transition-colors duration-500 pointer-events-none bg-ps-blue/0 group-hover:bg-[var(--bento-blue-from)] opacity-50"></div>

                                        <div className="relative z-10 w-full">
                                            <h4 className="font-bold text-sm sm:text-base mb-2.5 transition-colors duration-500 flex items-center gap-2 text-primary group-hover:text-ps-blue">
                                                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-500 text-secondary group-hover:text-ps-blue" />
                                                개발자에게 메시지 보내기
                                            </h4>

                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {['버그 리포트', '기능 건의', '커피 챗'].map(tag => (
                                                    <span key={tag} className="px-2.5 py-1 border rounded-md text-[11px] sm:text-xs font-bold shadow-sm transition-colors duration-500 bg-base border-divider-strong text-secondary">
                                                        {tag}
                                                    </span>
                                                ))}
                                                <span className="px-2.5 py-1 border rounded-md text-[11px] sm:text-xs font-bold shadow-sm transition-colors duration-500 bg-[var(--bento-blue-from)] border-[color:var(--bento-blue-border)] text-ps-blue">
                                                    비즈니스 제휴
                                                </span>
                                            </div>

                                            <p className="text-[11px] sm:text-xs leading-relaxed break-keep tracking-tight max-w-[280px] sm:max-w-none transition-colors duration-500 text-secondary">
                                                <strong className="font-medium transition-colors duration-500 text-primary">작은 의견</strong>이라도 소중하게 듣고 있습니다. <br className="block sm:hidden" />
                                                PS Tracker에 전하고 싶은 <strong className="font-medium transition-colors duration-500 text-primary">이야기</strong>가 있다면 <strong className="font-medium transition-colors duration-500 text-primary">언제든 편하게 메시지</strong>를 남겨주세요!
                                            </p>
                                        </div>

                                        <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all duration-500 shadow-inner w-full sm:w-max mt-1 bg-base border-divider group-hover:border-[color:var(--bento-blue-border-hover)] group-hover:bg-[var(--bento-blue-from)]">
                                            <span className="text-xs sm:text-sm font-mono font-bold tracking-wider drop-shadow-sm transition-colors duration-500 text-ps-blue relative">
                                                pstracker.help@gmail.com
                                                <div className="absolute -inset-x-2 -inset-y-1 bg-ps-blue/10 blur rounded opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            </span>
                                            <div className="p-1.5 rounded-lg transition-colors duration-500 shadow-sm bg-surface group-hover:bg-glass border border-transparent group-hover:border-[color:var(--bento-blue-border)] relative">
                                                <Copy className="w-4 h-4 transition-colors duration-500 text-secondary group-hover:text-ps-blue" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}