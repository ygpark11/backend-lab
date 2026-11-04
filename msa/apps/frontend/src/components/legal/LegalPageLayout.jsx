import React from 'react';
import { NavLink } from 'react-router-dom';
import { Circle, FileText, Shield, Square, Triangle, X as XIcon } from 'lucide-react';
import SEO from '../common/SEO';

export const CONTACT_EMAIL = 'pstracker.help@gmail.com';

const TABS = [
    { to: '/terms', label: '이용약관', Icon: FileText },
    { to: '/privacy', label: '개인정보처리방침', Icon: Shield },
];

// 법적 문서 공용 레이아웃: 이용약관 ↔ 개인정보처리방침 탭 전환 + 시행일 표기
const LegalPageLayout = ({ title, description, url, effectiveDate, children }) => (
    <div className="min-h-screen bg-base text-primary pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden transition-colors duration-500">
        <SEO title={title} description={description} url={url} />

        <div className="absolute top-20 right-10 pointer-events-none flex gap-8 rotate-12 scale-150 opacity-[0.02] dark:opacity-[0.03] text-primary">
            <Triangle className="w-40 h-40 stroke-[2px]" />
            <Circle className="w-40 h-40 stroke-[2px]" />
            <XIcon className="w-40 h-40 stroke-[2px]" />
            <Square className="w-40 h-40 stroke-[2px]" />
        </div>

        <div className="max-w-3xl mx-auto relative z-10">
            <nav aria-label="법적 고지 문서" className="flex gap-1 p-1 mb-6 sm:mb-8 bg-surface border border-divider rounded-2xl">
                {TABS.map(({ to, label, Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        replace
                        className={({ isActive }) =>
                            `flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors active:scale-95 ${
                                isActive ? 'bg-base text-primary shadow-sm border border-divider' : 'text-secondary hover:text-primary'
                            }`
                        }
                    >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        {label}
                    </NavLink>
                ))}
            </nav>

            <header className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{title}</h1>
                <p className="mt-2 text-xs font-bold tracking-wider text-muted">시행일 {effectiveDate}</p>
            </header>

            <article className="space-y-10 text-sm sm:text-[15px] leading-7 text-secondary break-keep">
                {children}
            </article>
        </div>
    </div>
);

export const LegalSection = ({ title, children }) => (
    <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-black text-primary">{title}</h2>
        {children}
    </section>
);

export const LegalList = ({ items }) => (
    <ul className="list-disc pl-5 space-y-1.5">
        {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
);

export const ContactEmail = () => (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-ps-blue underline underline-offset-2 whitespace-nowrap">
        {CONTACT_EMAIL}
    </a>
);

export default LegalPageLayout;
