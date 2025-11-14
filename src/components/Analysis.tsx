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
    const { play, reason, frequencies, isBettingOpportunity } = result;
    const { counts, hot, cold } = frequencies;

    const showMitadesSuggestion = bettingMode === 'mitades' && isBettingOpportunity && (play.includes('18') || play.includes('36'));

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

    const DozensAnalysisView = () => {
        const getBoxClass = (dozen: Dozen) => {
            const baseClass = "text-center p-3 rounded-xl bg-[#1a1f25]/80 border-2 border-transparent transition-all duration-300";
            if (hot.includes(dozen) && hot.length < 3) return `${baseClass} border-[#d94545]`;
            if (cold.includes(dozen) && cold.length < 3) return `${baseClass} border-[#4e9de0]`;
            return baseClass;
        };
        
        const suggestionStyle = {
            box: "p-5 mb-4 text-center rounded-lg transition-colors duration-300 shadow-lg bg-[#1a1f25]/50",
            title: "text-[#f0b90b]",
            reason: "text-gray-400"
        };

        const displayPlay = play.includes('y') ? `Apostar a ${play}` : play;

        return (
             <>
                <h2 className="text-2xl font-bold text-white mb-4 pb-3 border-b-2 border-white/10">Análisis y Sugerencia</h2>

                {isBettingOpportunity && isRiskActive && play !== 'Esperar' && (
                    <div className="mb-4 p-3 rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/30 border border-red-500 animate-fade-in">
                        <div className="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2.05v6.9h4L11 21.95v-6.9H7l6-13z"></path></svg>
                            <div>
                                <h3 className="text-lg font-bold">Oportunidad de Apuesta Detectada</h3>
                            </div>
                        </div>
                    </div>
                )}

                <div className={suggestionStyle.box}>
                    <div className={`text-3xl font-bold mb-1 ${suggestionStyle.title}`}>
                        {displayPlay}
                    </div>
                    <div className={`text-base italic min-h-[1.5em] ${suggestionStyle.reason}`}>
                        {reason}
                    </div>
                    <RiskInfo />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className={getBoxClass('D1')}><div className="text-lg font-semibold">D1</div><div className="text-4xl font-bold">{counts.D1}</div></div>
                    <div className={getBoxClass('D2')}><div className="text-lg font-semibold">D2</div><div className="text-4xl font-bold">{counts.D2}</div></div>
                    <div className={getBoxClass('D3')}><div className="text-lg font-semibold">D3</div><div className="text-4xl font-bold">{counts.D3}</div></div>
                </div>
            </>
        );
    };

    const MitadesSuggestionView = () => (
        <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-4 pb-3 border-b-2 border-white/10">Sugerencia de Apuesta</h2>
            <div className={`p-6 text-center rounded-xl ${play === '1-18' ? 'bg-red-600' : 'bg-amber-600'}`}>
                <div className="text-4xl font-bold text-white tracking-wider">{`Apostar: ${play}`}</div>
                <div className="text-lg text-gray-200 italic mt-2">{reason}</div>
                <RiskInfo />
            </div>
        </div>
    );

    const MitadesWaitingView = () => (
        <div className="animate-fade-in text-center flex flex-col items-center justify-center h-full min-h-[300px]">
            <svg className="w-12 h-12 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-white mb-2">Modo Mitades: {play}</h2>
            <p className="text-gray-400 max-w-sm">{reason}</p>
        </div>
    );

    return (
        <div className="bg-[#2a313b]/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-2xl">
            {bettingMode === 'mitades' ? (
                showMitadesSuggestion ? <MitadesSuggestionView /> : <MitadesWaitingView />
            ) : (
                <DozensAnalysisView />
            )}
        </div>
    );
};

export default Analysis;
