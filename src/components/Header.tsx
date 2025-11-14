import React from 'react';

interface HeaderProps {
    onToggleNav: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleNav }) => {
    return (
        <header className="bg-[#2a313b]/50 backdrop-blur-sm sticky top-0 z-30 p-4 border-b border-white/10 flex items-center">
            <button
                onClick={onToggleNav}
                className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors mr-4"
                aria-label="Abrir menú de navegación"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>
            <h1 className="text-xl font-bold text-white tracking-wide">
                R-PA <span className="font-light text-gray-300 hidden sm:inline">(Roulette Pattern Analyzer)</span>
            </h1>
        </header>
    );
};

export default Header;
