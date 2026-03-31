import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
    return (
        <div className="min-h-screen bg-base text-primary flex flex-col transition-colors duration-500">
            <Navbar />

            <main className="flex-grow">
                <Outlet />
            </main>

            <footer className="w-full border-t border-divider text-center px-4 py-8 mt-10 opacity-60 hover:opacity-100 transition-opacity">
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