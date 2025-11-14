import React from 'react';
import { HistoryEntry } from '../types';

interface ControlsProps {
    onAddEntry: (entry: HistoryEntry) => void;
    onUndo: () => void;
    isUndoDisabled: boolean;
    isBettingActive: boolean;
    onToggleBetting: () => void;
    isRiskEnabled: boolean;
}

const Controls: React.FC<ControlsProps> = ({ 
    onAddEntry, 
    onUndo, 
    isUndoDisabled,
    isBettingActive,
    onToggleBetting,
    isRiskEnabled,
}) => {
    return (
        <div className="relative p-6 bg-[#2a313b]/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl h-full flex flex-col justify-between">
            <div>
                 {isRiskEnabled && (
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white mb-3">Control de Apuestas</h2>
                        <button 
                            onClick={onToggleBetting} 
                            className={`w-full py-3 px-2 text-center font-semibold rounded-lg transition-all duration-300 text-white shadow-lg transform hover:scale-105 active:scale-100 ${
                                isBettingActive 
                                ? 'bg-red-600 hover:bg-red-500' 
                                : 'bg-emerald-600 hover:bg-emerald-500'
                            }`}
                        >
                            {isBettingActive ? 'Pausar Apuestas' : 'Iniciar Apuestas'}
                        </button>
                        <p className="text-xs text-center mt-2 text-gray-400">
                            {isBettingActive 
                                ? 'Las nuevas entradas se registrarán como apuestas.' 
                                : 'Modo de solo análisis. Las entradas no generarán apuestas.'}
                        </p>
                    </div>
                 )}

                <h2 className="text-xl font-bold text-white mb-4">Añadir Entrada</h2>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => onAddEntry('D1')} className="py-3 px-2 text-center font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 transition-all duration-200 text-white shadow-md transform hover:scale-105 active:scale-100">Docena 1</button>
                    <button onClick={() => onAddEntry('D2')} className="py-3 px-2 text-center font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-all duration-200 text-white shadow-md transform hover:scale-105 active:scale-100">Docena 2</button>
                    <button onClick={() => onAddEntry('D3')} className="py-3 px-2 text-center font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 transition-all duration-200 text-white shadow-md transform hover:scale-105 active:scale-100">Docena 3</button>
                    <button onClick={() => onAddEntry('Cero')} className="py-3 px-2 text-center font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-all duration-200 text-white shadow-md transform hover:scale-105 active:scale-100">Cero</button>
                </div>
            </div>

            <div className="mt-6">
                 <button 
                    onClick={onUndo} 
                    disabled={isUndoDisabled}
                    className="w-full py-3 font-semibold rounded-lg bg-[#6c757d] hover:bg-[#5a6268] text-white transition-all duration-200 disabled:bg-[#4a5258] disabled:cursor-not-allowed disabled:opacity-50 shadow-md transform hover:enabled:scale-105 active:enabled:scale-100"
                >
                    Deshacer
                </button>
            </div>
        </div>
    );
};

export default Controls;