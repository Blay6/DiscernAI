import React, { useState } from 'react';
import { HistoryEntry, BetHistoryEntry } from '../types';

interface HistoryProps {
    history: HistoryEntry[];
}

export const SpinHistory: React.FC<HistoryProps> = ({ history }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getEntryStyle = (entry: HistoryEntry, isHighlighted: boolean): string => {
        const baseClasses = "aspect-square flex items-center justify-center rounded-lg font-bold text-white text-sm md:text-base transition-all duration-300 shadow-inner";
        
        let colorClasses = '';
        switch (entry) {
            case 'D1': colorClasses = 'bg-sky-600'; break;
            case 'D2': colorClasses = 'bg-indigo-600'; break;
            case 'D3': colorClasses = 'bg-amber-600'; break;
            case 'Cero': colorClasses = 'bg-emerald-600'; break;
            default: colorClasses = 'bg-[#3b4452]'; break;
        }

        if (isHighlighted) {
            return `${baseClasses} ${colorClasses} ring-4 ring-offset-2 ring-offset-[#1a1f25] ring-[#f0b90b] scale-110 shadow-lg z-10`;
        }
        
        return `${baseClasses} ${colorClasses}`;
    };

    const historyToShow = isExpanded ? history.slice(0, 60) : history.slice(0, 10);

    return (
        <div className="p-6 bg-[#2a313b]/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl h-full flex flex-col">
            <h3 className="text-lg font-bold text-white mb-3 shrink-0">Historial de Giros (Últimos {historyToShow.length})</h3>
            <div className="p-3 bg-[#1a1f25] rounded-lg flex-grow flex">
                {historyToShow.length > 0 ? (
                    <div className="grid grid-cols-10 gap-1.5 w-full">
                        {historyToShow.map((entry, index) => (
                            <div key={index} className="relative">
                                <div className={getEntryStyle(entry, index === 0)}>
                                    {entry === 'Cero' ? '0' : entry}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="w-full h-full min-h-[150px] flex items-center justify-center text-center text-gray-400 bg-[#1a1f25] rounded-lg">
                        <p>Añade una docena o cero<br/>para empezar el análisis.</p>
                    </div>
                )}
            </div>
            {history.length > 10 && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full mt-3 py-2 text-sm font-semibold rounded-lg bg-[#3b4452]/70 hover:bg-[#4a5258] text-white transition-all duration-200 shrink-0"
                >
                    {isExpanded ? 'Mostrar menos' : 'Mostrar más'}
                </button>
            )}
        </div>
    );
};


interface BetHistoryTableProps {
    history: BetHistoryEntry[];
}

export const BetHistoryTable: React.FC<BetHistoryTableProps> = ({ history }) => {
    return (
        <div className="h-full flex flex-col p-6 bg-[#2a313b]/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl">
             <h3 className="text-lg font-bold text-white mb-3 shrink-0">Historial de Apuestas</h3>
            <div className="overflow-auto flex-grow">
                {history.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-sm text-left text-gray-300">
                            <thead className="text-xs text-gray-400 uppercase bg-[#1a1f25] sticky top-0">
                                <tr>
                                    <th scope="col" className="px-4 py-3">Ronda</th>
                                    <th scope="col" className="px-4 py-3">Sugerencia</th>
                                    <th scope="col" className="px-4 py-3">Apuesta</th>
                                    <th scope="col" className="px-4 py-3">Resultado</th>
                                    <th scope="col" className="px-4 py-3">Ganancia</th>
                                    <th scope="col" className="px-4 py-3">Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((bet, index) => (
                                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/20">
                                        <td className="px-4 py-3 font-medium">{bet.round}</td>
                                        <td className="px-4 py-3">{bet.suggestion}</td>
                                        <td className="px-4 py-3">
                                            <div>{(bet.betAmount ?? 0).toFixed(2)}</div>
                                            {(bet.zeroBetAmount ?? 0) > 0 && <div className="text-xs text-emerald-400">Cero: {(bet.zeroBetAmount ?? 0).toFixed(2)}</div>}
                                        </td>
                                        <td className={`px-4 py-3 font-bold ${bet.result === 'WIN' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {bet.result} ({bet.outcome})
                                        </td>
                                        <td className={`px-4 py-3 font-semibold ${(bet.profit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {(bet.profit ?? 0).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3">{(bet.balance ?? 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                     <div className="h-full flex items-center justify-center text-center text-gray-400 bg-[#1a1f25] rounded-lg">
                        <p>Active la gestión de riesgo y<br/>realice una apuesta para ver el historial.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
