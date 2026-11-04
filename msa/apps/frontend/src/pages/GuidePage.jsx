import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Circle, Database, Shield, Siren, Square, Triangle, X as XIcon } from 'lucide-react';
import SEO from '../components/common/SEO';
import { DEFENSE_GUIDE, VERDICT_GUIDE } from '../constants/priceGuide';

const SectionTitle = ({ Icon, children }) => (
    <h2 className="flex items-center gap-2 text-lg sm:text-xl font-black text-primary">
        <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
        {children}
    </h2>
);

const GuidePage = () => (
    <div className="min-h-screen bg-base text-primary pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden transition-colors duration-500">
        <SEO
            title="가격 판단 기준"
            description="PS Tracker의 가격 신호등(○△×□)과 할인 방어력 등급이 어떤 기준으로 계산되는지, 가격 데이터를 어떻게 수집하는지 안내합니다."
            url="https://ps-signal.com/guide"
        />

        <div className="absolute top-20 right-10 pointer-events-none flex gap-8 rotate-12 scale-150 opacity-[0.02] dark:opacity-[0.03] text-primary">
            <Triangle className="w-40 h-40 stroke-[2px]" />
            <Circle className="w-40 h-40 stroke-[2px]" />
            <XIcon className="w-40 h-40 stroke-[2px]" />
            <Square className="w-40 h-40 stroke-[2px]" />
        </div>

        <div className="max-w-3xl mx-auto relative z-10 space-y-12 text-sm sm:text-[15px] leading-7 text-secondary break-keep">
            <header>
                <p className="text-xs font-bold tracking-wider uppercase text-muted">Price Signal Guide</p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-primary">가격 판단 기준</h1>
                <p className="mt-4">
                    "50% 할인이니까 싸다"가 아니라 "예전에 더 싸게 팔았으니 지금은 기다리자"처럼, PS Tracker는 <strong className="text-primary">과거 가격 기록과 비교해서</strong> 지금 가격이 살 만한지 알려드려요. 이 페이지는 그 판단이 어떤 기준으로 계산되는지 설명합니다.
                </p>
            </header>

            <section className="space-y-4">
                <SectionTitle Icon={Siren}>가격 신호등</SectionTitle>
                <p>
                    PS 컨트롤러 버튼 모양으로 현재 가격의 구매 적절성을 표시해요. 기준이 되는 <strong className="text-primary">역대 최저가</strong>는 PS Tracker가 해당 게임을 추적하기 시작한 이후 기록된 가장 낮은 가격이에요.
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                    {VERDICT_GUIDE.map(({ key, Icon, label, name, rule, color, iconClass }) => (
                        <li key={key} className="p-4 rounded-2xl bg-surface border border-divider">
                            <div className={`flex items-center gap-2 font-black ${color}`}>
                                <Icon className={`w-5 h-5 shrink-0 ${iconClass}`} aria-hidden="true" />
                                <span className="text-xs tracking-wider uppercase">{label}</span>
                                <span className="text-primary">{name}</span>
                            </div>
                            <p className="mt-2">{rule}</p>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="space-y-4">
                <SectionTitle Icon={Shield}>할인 방어력</SectionTitle>
                <p>
                    이 게임이 얼마나 깊게 할인되는지를 등급으로 나타내요. 등급은 할인 횟수나 빈도가 아니라 <strong className="text-primary">가장 깊었던 할인 한 번</strong>을 기준으로 정해요.
                </p>
                <p className="p-4 rounded-2xl bg-surface border border-divider">
                    <strong className="text-primary">최대 할인율</strong> = (정가 − 역대 최저가) ÷ 정가
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                    {DEFENSE_GUIDE.map(({ key, name, rule }) => (
                        <li key={key} className="p-4 rounded-2xl bg-surface border border-divider">
                            <p className="font-black text-primary">{name}</p>
                            <p className="mt-1">{rule}</p>
                        </li>
                    ))}
                </ul>
                <div className="space-y-2">
                    <h3 className="font-black text-primary">다음 예상 할인</h3>
                    <p>
                        마지막 할인 시작일에 평균 할인 주기(추적 개월 수 ÷ 할인 횟수)를 더해 계산해요. 추적을 시작할 때 이미 할인 중이던 기록은 주기 계산에서 빼고, 할인이 2번 이상 기록된 게임만 계산해요. 과거 패턴에 기반한 추정이라 실제 할인 일정과 다를 수 있어요.
                    </p>
                </div>
            </section>

            <section className="space-y-4">
                <SectionTitle Icon={Database}>데이터는 이렇게 모아요</SectionTitle>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>매일 자정부터 PlayStation Store(한국)의 공개 가격을 순서대로 수집해요.</li>
                    <li>가격 이력은 가격이 바뀔 때만 기록돼요. 그래서 할인 횟수는 할인으로 바뀐 기록의 수예요.</li>
                    <li>추적을 시작하기 전의 가격은 포함되지 않아요. 상세 화면에 "수집 시작" 시점이 표시된 게임은 그 이후 기록만 반영돼요.</li>
                    <li>평점은 Metacritic 점수를 우선 보여주고, 없으면 IGDB 점수를 보여줘요. 플레이타임은 HowLongToBeat 집계 기준이에요.</li>
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-base sm:text-lg font-black text-primary">알아두세요</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>통계 인사이트의 신호등 현황판은 <strong className="text-primary">현재 할인 중인 게임</strong>을 기준으로 집계해요. 할인 중이 아닌 게임은 현황판에서 TRACKING으로 분류돼요.</li>
                    <li>
                        모든 판단은 구매 결정을 돕기 위한 참고 정보예요. 결제 전에는 PS Store에서 최종 가격을 꼭 확인해 주세요. 자세한 내용은{' '}
                        <Link to="/terms" className="font-bold text-ps-blue underline underline-offset-2">이용약관</Link>을 참고해 주세요.
                    </li>
                </ul>
            </section>

            <Link
                to="/games"
                className="flex items-center justify-center gap-2 w-full sm:w-auto sm:inline-flex px-6 py-3 rounded-xl bg-primary text-[color:var(--color-bg-base)] font-bold hover:opacity-80 active:scale-95 transition-transform"
            >
                게임 목록에서 신호등 확인하기 <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
        </div>
    </div>
);

export default GuidePage;
