import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
    return (
        <div className="min-h-screen bg-ps-black text-white flex flex-col">
            <Navbar />

            <main className="flex-grow">
                <Outlet />
            </main>

            <footer className="w-full border-t border-white/5 text-center px-4 py-8 mt-10 opacity-60 hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                    © {new Date().getFullYear()} PS Tracker. All rights reserved.<br />
                    Not affiliated with Sony Interactive Entertainment Inc.<br />
                    Game titles, images, and trademarks are property of their respective owners.
                </p>
            </footer>
        </div>
    );
};

export default Layout;