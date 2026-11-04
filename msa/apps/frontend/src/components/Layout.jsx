import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { CONTACT_EMAIL } from './legal/LegalPageLayout';

const Layout = () => {
    return (
        <div className="min-h-screen bg-base text-primary flex flex-col transition-colors duration-500">
            <Navbar />

            <main className="flex-grow" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                <Outlet />
            </main>

            <footer className="w-full border-t border-divider text-center px-4 py-8 mt-10 opacity-60 hover:opacity-100 transition-opacity">
                <nav aria-label="사이트 안내" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-3 text-xs font-bold text-secondary">
                    <Link to="/guide" className="hover:text-primary transition-colors">가격 판단 기준</Link>
                    <Link to="/terms" className="hover:text-primary transition-colors">이용약관</Link>
                    <Link to="/privacy" className="text-primary hover:text-ps-blue transition-colors">개인정보처리방침</Link>
                    <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-primary transition-colors">문의 {CONTACT_EMAIL}</a>
                </nav>
                <p className="text-[10px] text-secondary leading-relaxed font-medium transition-colors duration-500">
                    © {new Date().getFullYear()} PS Tracker. All rights reserved.<br />
                    Not affiliated with Sony Interactive Entertainment Inc.<br />
                    Game titles, images, and trademarks are property of their respective owners.
                </p>
            </footer>
        </div>
    );
};

export default Layout;