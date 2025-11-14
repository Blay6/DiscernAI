// FIX: Import React to bring the JSX namespace into scope.
import React from 'react';
import { AppView } from '../types';

interface NavMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (view: AppView) => void;
    onOpenSettings: () => void;
    currentView: AppView;
}

const NavLink: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    // FIX: Use React.ReactElement instead of JSX.Element for explicit typing to resolve namespace issue.
    icon: React.ReactElement;
}> = ({ label, isActive, onClick, icon }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center p-3 rounded-lg text-left transition-colors duration-200 ${
            isActive
                ? 'bg-[#f0b90b] text-[#1a1a1a] font-bold'
                : 'text-gray-200 hover:bg-white/10'
        }`}
    >
        <span className="mr-3">{icon}</span>
        {label}
    </button>
);

const NavMenu: React.FC<NavMenuProps> = ({ isOpen, onClose, onNavigate, onOpenSettings, currentView }) => {
    return (
        <>
            <div 
                className={`fixed inset-0 bg-black/60 z-40 nav-backdrop ${isOpen ? 'open' : ''}`}
                onClick={onClose}
            ></div>
            <nav className={`fixed top-0 left-0 h-full w-64 bg-[#2a313b] border-r border-white/10 shadow-2xl p-6 z-50 sidebar-nav ${isOpen ? 'open' : ''}`}>
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-lg font-bold text-white">Menú</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-gray-400">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="space-y-3">
                    <NavLink
                        label="Dashboard"
                        isActive={currentView === 'dashboard'}
                        onClick={() => onNavigate('dashboard')}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>}
                    />
                    <NavLink
                        label="Estadísticas"
                        isActive={currentView === 'statistics'}
                        onClick={() => onNavigate('statistics')}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm3 2a1 1 0 00-2 0v6a1 1 0 102 0V5zm4 0a1 1 0 10-2 0v2a1 1 0 102 0V5zm2 4a1 1 0 10-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" /></svg>}
                    />
                    <NavLink
                        label="Configuración"
                        isActive={false}
                        onClick={onOpenSettings}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0l-.1.41a1.5 1.5 0 01-2.1 1.45l-.4-.17c-1.5-.65-3.22.8-2.57 2.3l.17.4a1.5 1.5 0 01-1.45 2.1l-.41.1c-1.56.38-1.56 2.6 0 2.98l.41.1a1.5 1.5 0 011.45 2.1l-.17.4c-.65 1.5.8 3.22 2.3 2.57l.4-.17a1.5 1.5 0 012.1 1.45l.1.41c.38 1.56 2.6 1.56 2.98 0l.1-.41a1.5 1.5 0 012.1-1.45l.4.17c1.5.65 3.22-.8 2.57-2.3l-.17-.4a1.5 1.5 0 011.45-2.1l.41-.1c1.56-.38-1.56-2.6 0-2.98l-.41-.1a1.5 1.5 0 01-1.45-2.1l.17-.4c.65-1.5-.8-3.22-2.3-2.57l-.4.17a1.5 1.5 0 01-2.1-1.45l-.1-.41zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>}
                    />
                </div>
            </nav>
        </>
    );
};

export default NavMenu;