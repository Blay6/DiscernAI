import React from 'react';
import { AnalysisResult, Dozen, BettingMode } from '../types';

interface AnalysisProps {
    result: AnalysisResult;
    bettingMode: BettingMode;
    calculatedBet: {
        mainBet: number;
        perDozen?: number;
        zeroBet: number;
        totalRisk: number;
        potentialProfit: number;
    } | null;
    isRiskActive: boolean;
}

const Analysis: React.FC<AnalysisProps> = ({ result, bettingMode, calculatedBet, isRiskActive }) => {
    const { play, reason, frequencies, isBettingOpportunity, analysisWindowSize } = result;
    const { counts, hot, cold } = frequencies;

    const isUsingColdLogic = reason.toLowerCase().includes('fría');
    const isUsingHotLogic = reason.toLowerCase().includes('caliente');

    const RiskInfo: React.FC = () => {
        if (!isRiskActive || !calculatedBet) return null;

        return (
            <div className="mt-4 p-4 rounded-lg bg-[#1a1f25] border border-white/10 animate-fade-in">
                <h4 className="font-bold text-lg text-[#f0b90b] mb-2">Plan de Apuesta (Ronda Actual)</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="text-gray-400">Apostar:</div>
                    <div className="text-white font-semibold text-right">
                        {calculatedBet.mainBet.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}
                        {calculatedBet.perDozen && <span className="text-xs text-gray-400"> (${calculatedBet.perDozen.toFixed(2)} / Docena)</span>}
                    </div>

                    {calculatedBet.zeroBet > 0 && <>
                        <div className="text-gray-400">Apostar Cero:</div>
                        <div className="text-white font-semibold text-right">{calculatedBet.zeroBet.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}</div>
                    </>}

                    <div className="text-gray-400">Riesgo Total:</div>
                    <div className="text-red-400 font-semibold text-right">{calculatedBet.totalRisk.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}</div>
                    
                    <div className="text-gray-400">Beneficio Potencial:</div>
                    <div className="text-emerald-400 font-semibold text-right">{calculatedBet.potentialProfit.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}</div>
                </div>
            </div>
        )
    };

    const DozenBox: React.FC<{ dozen: Dozen }> = ({ dozen }) => {
        const isSuggestedToPlay = play.includes(dozen);
        const isHot = hot.includes(dozen) && hot.length < 3;
        const isCold = cold.includes(dozen) && cold.length < 3;
    
        let boxClass = 'text-center p-3 rounded-xl bg-[#1a1f25]/80 border-2 transition-all duration-300 relative';
        let labelElement = null;
    
        if (isSuggestedToPlay) {
            boxClass += ' border-emerald-500 shadow-lg shadow-emerald-500/20';
            labelElement = <span className="absolute top-1 right-2 text-xs font-bold text-emerald-400 uppercase">Jugar</span>;
        } else if (isHot) {
            boxClass += ' border-[#d94545]';
            const shouldHighlight = isHot && isUsingHotLogic;
            labelElement = <span className={`absolute top-1 right-2 text-xs font-bold text-[#d94545] uppercase ${shouldHighlight ? 'underline decoration-2 decoration-amber-400' : ''}`}>Caliente</span>;
        } else if (isCold) {
            boxClass += ' border-[#4e9de0]';
            const shouldHighlight = isCold && isUsingColdLogic;
            labelElement = <span className={`absolute top-1 right-2 text-xs font-bold text-[#4e9de0] uppercase ${shouldHighlight ? 'underline decoration-2 decoration-amber-400' : ''}`}>Frío</span>;
        } else {
            boxClass += ' border-transparent';
        }
    
        return (
            <div className={boxClass}>
                {labelElement}
                <div className="text-lg font-semibold">{dozen}</div>
                <div className="text-4xl font-bold">{counts[dozen]}</div>
            </div>
        );
    };

    const SuggestionArea = () => {
        const displayPlay = bettingMode === 'docenas'
            ? play.includes('y') ? `Apostar a ${play}` : play
            : `Apostar: ${play}`;
        
        const showMitadesSuggestion = bettingMode === 'mitades' && isBettingOpportunity && (play.includes('18') || play.includes('36'));

        if (bettingMode === 'mitades' && !showMitadesSuggestion) {
            return (
                <div className="animate-fade-in text-center flex flex-col items-center justify-center min-h-[150px] mb-4">
                    <svg className="w-12 h-12 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-white mb-2">Modo Mitades: {play}</h2>
                    <p className="text-gray-400 max-w-sm">{reason}</p>
                </div>
            );
        }
        
        const boxBg = bettingMode === 'mitades' 
            ? play === '1-18' ? 'bg-red-600' : 'bg-amber-600'
            : 'bg-[#1a1f25]/50';

        return (
            <div className={`p-5 mb-4 text-center rounded-lg transition-colors duration-300 shadow-lg ${boxBg}`}>
                <div className={`text-3xl font-bold mb-1 ${bettingMode === 'mitades' ? 'text-white' : 'text-[#f0b90b]'}`}>
                    {displayPlay}
                </div>
                <div className={`text-base italic min-h-[1.5em] ${bettingMode === 'mitades' ? 'text-gray-200' : 'text-gray-400'}`}>
                    {reason}
                </div>
                <RiskInfo />
            </div>
        );
    };

    return (
        <div className="bg-[#2a313b]/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-1 pb-3 border-b-2 border-white/10">Análisis y Sugerencia</h2>
            { analysisWindowSize > 0 && <p className="text-sm text-gray-400 mb-4">Basado en los últimos {analysisWindowSize} giros</p> }
            
            {isBettingOpportunity && isRiskActive && play !== 'Esperar' && !play.includes('Conflicto') && (
                <div className="mb-4 p-3 rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/30 border border-red-500 animate-fade-in">
                    <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2.05v6.9h4L11 21.95v-6.9H7l6-13z"></path></svg>
                        <div>
                            <h3 className="text-lg font-bold">Oportunidad de Apuesta Detectada</h3>
                        </div>
                    </div>
                </div>
            )}
            
            <SuggestionArea />
            
            <div className="mt-6 pt-6 border-t border-white/10">
                 <h3 className="text-xl font-bold text-white mb-4">Contadores de Docenas</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DozenBox dozen="D1" />
                    <DozenBox dozen="D2" />
                    <DozenBox dozen="D3" />
                </div>
            </div>
        </div>
    );
};

export default Analysis;
