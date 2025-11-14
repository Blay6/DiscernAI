import React, { useState, useMemo } from 'react';
import { Strategy, StrategyState, Dozen, BetHistoryEntry, BettingMode, RiskSettings } from '../types';

// --- Calculation Helpers ---

const calculateStreaks = (history: BetHistoryEntry[]): { winStreak: number; lossStreak: number } => {
    let maxWinStreak = 0, currentWinStreak = 0, maxLossStreak = 0, currentLossStreak = 0;
    for (const bet of [...history].reverse()) { // Iterate from oldest to newest
        if (bet.result === 'WIN') {
            currentWinStreak++;
            currentLossStreak = 0;
            if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
        } else {
            currentLossStreak++;
            currentWinStreak = 0;
            if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
        }
    }
    return { winStreak: maxWinStreak, lossStreak: maxLossStreak };
};

const calculateMaxDrawdown = (history: BetHistoryEntry[], startBalance: number): { value: number; percentage: number } => {
    if (history.length === 0) return { value: 0, percentage: 0 };
    let peak = startBalance;
    let maxDrawdownValue = 0;
    const balances = [startBalance, ...[...history].reverse().map(h => h.balance)];
    for (const balance of balances) {
        if (balance > peak) peak = balance;
        const drawdown = peak - balance;
        if (drawdown > maxDrawdownValue) maxDrawdownValue = drawdown;
    }
    const maxDrawdownPercentage = peak > 0 ? (maxDrawdownValue / peak) * 100 : 0;
    return { value: maxDrawdownValue, percentage: maxDrawdownPercentage };
};

const calculateAdvancedMetrics = (history: BetHistoryEntry[], totalProfit: number): { roi: number; profitFactor: number; totalInvested: number } => {
    const totalInvested = history.reduce((acc, bet) => acc + bet.totalRisk, 0);
    const grossWinnings = history.filter(b => b.result === 'WIN').reduce((acc, b) => acc + b.profit, 0);
    const grossLosses = Math.abs(history.filter(b => b.result === 'LOSS').reduce((acc, b) => acc + b.profit, 0));
    const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
    const profitFactor = grossLosses > 0 ? grossWinnings / grossLosses : (grossWinnings > 0 ? Infinity : 0);
    return { roi, profitFactor, totalInvested };
};


// --- UI Components ---

const HistoryModal: React.FC<{ strategy: Strategy; history: BetHistoryEntry[]; onClose: () => void }> = ({ strategy, history, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
        <div className="bg-[#2a313b] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-4xl m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10 shrink-0">
                <h2 className="text-xl sm:text-2xl font-bold text-white capitalize">Historial de Apuestas: {strategy}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors duration-200" aria-label="Cerrar historial"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="overflow-y-auto flex-grow min-h-0">
                 <table className="w-full min-w-[600px] text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-[#3b4452] sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-3">Ronda</th><th scope="col" className="px-4 py-3">Sugerencia</th><th scope="col" className="px-4 py-3">Apuesta</th><th scope="col" className="px-4 py-3">Resultado</th><th scope="col" className="px-4 py-3">Ganancia</th><th scope="col" className="px-4 py-3">Balance</th>
                        </tr>
                    </thead>
                    <tbody className="bg-[#2a313b]">
                        {history.map((bet, index) => (
                            <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/20">
                                <td className="px-4 py-3 font-medium">{bet.round}</td><td className="px-4 py-3">{bet.suggestion}</td>
                                <td className="px-4 py-3"><div>{(bet.betAmount ?? 0).toFixed(2)}</div>{bet.zeroBetAmount > 0 && <div className="text-xs text-emerald-400">Cero: {(bet.zeroBetAmount ?? 0).toFixed(2)}</div>}</td>
                                <td className={`px-4 py-3 font-bold ${bet.result === 'WIN' ? 'text-emerald-400' : 'text-red-400'}`}>{bet.result} ({bet.outcome})</td>
                                <td className={`px-4 py-3 font-semibold ${bet.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(bet.profit ?? 0).toFixed(2)}</td>
                                <td className="px-4 py-3">{(bet.balance ?? 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);


const StatsCard: React.FC<{ title: string; value: string | number; valueClassName?: string }> = ({ title, value, valueClassName = 'text-white' }) => (
    <div className={`bg-[#2a313b]/50 p-4 rounded-xl border border-white/10 text-center`}>
        <div className="text-sm text-gray-400">{title}</div>
        <div className={`text-3xl font-bold ${valueClassName}`}>{value}</div>
    </div>
);

const DozenStats: React.FC<{ spinHistory: StrategyState['spinHistory'] }> = ({ spinHistory }) => {
    const totalSpins = spinHistory.length;
    if (totalSpins === 0) return <div className="text-center text-gray-400 col-span-3">No hay datos de docenas.</div>;
    const counts = { D1: 0, D2: 0, D3: 0, Cero: 0 };
    spinHistory.forEach(s => counts[s]++);
    return (<>{(['D1', 'D2', 'D3'] as Dozen[]).map(dozen => (<div key={dozen} className="bg-[#1a1f25]/80 p-4 rounded-lg"><div className="flex justify-between items-baseline"><span className="font-bold text-lg">{dozen}</span><span className="text-gray-400 text-sm">{((counts[dozen] / totalSpins) * 100).toFixed(1)}%</span></div><div className="text-2xl font-bold">{counts[dozen]} <span className="text-base font-normal text-gray-300">apariciones</span></div></div>))}</>);
};

const StrategyAnalysisCard: React.FC<{ history: BetHistoryEntry[]; startBalance: number; strategyName: Strategy; onViewHistory: () => void; }> = ({ history, startBalance, strategyName, onViewHistory }) => {

    const metrics = useMemo(() => {
        const totalBets = history.length;
        if (totalBets === 0) return null;

        const totalProfit = history.reduce((acc, bet) => acc + bet.profit, 0);
        const finalBalance = history.length > 0 ? history[0].balance : startBalance;

        const wins = history.filter(h => h.result === 'WIN').length;
        const winRate = (wins / totalBets) * 100;
        const profitPercentage = startBalance > 0 ? (totalProfit / startBalance) * 100 : 0;
        const streaks = calculateStreaks(history);
        const drawdown = calculateMaxDrawdown(history, startBalance);
        const { roi, profitFactor } = calculateAdvancedMetrics(history, totalProfit);
        
        return { totalBets, wins, winRate, profitPercentage, streaks, drawdown, roi, profitFactor, totalProfit, finalBalance };
    }, [history, startBalance]);
    
    return (
        <div className="bg-[#2a313b]/50 p-5 rounded-xl border border-white/10 flex flex-col">
            <h4 className="text-xl font-bold text-center mb-4 capitalize text-[#f0b90b]">{strategyName}</h4>
            {metrics ? (
                <div className="space-y-3 text-sm flex-grow">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-3 border-b border-white/10">
                        <div className="font-semibold text-gray-300">Ganancia Neta:</div><div className={`font-bold text-right ${metrics.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(metrics.totalProfit ?? 0).toFixed(2)}</div>
                        <div className="font-semibold text-gray-300">% Ganancia Neta:</div><div className={`font-bold text-right ${metrics.profitPercentage >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(metrics.profitPercentage ?? 0).toFixed(2)}%</div>
                        <div className="font-semibold text-gray-300">Balance Final:</div><div className="font-bold text-right">{(metrics.finalBalance ?? 0).toFixed(2)}</div>
                        <div className="font-semibold text-gray-300">Tasa de Victoria:</div><div className="font-bold text-right">{(metrics.winRate ?? 0).toFixed(1)}% ({metrics.wins}/{metrics.totalBets})</div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                        <div className="font-semibold text-gray-300">ROI:</div><div className={`font-bold text-right ${metrics.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{(metrics.roi ?? 0).toFixed(2)}%</div>
                        <div className="font-semibold text-gray-300">Factor de Ganancia:</div><div className="font-bold text-right">{isFinite(metrics.profitFactor) ? (metrics.profitFactor ?? 0).toFixed(2) : 'N/A'}</div>
                        <div className="font-semibold text-gray-300">Max Drawdown:</div><div className="font-bold text-right text-red-400">{(metrics.drawdown.value ?? 0).toFixed(2)} ({(metrics.drawdown.percentage ?? 0).toFixed(1)}%)</div>
                        <div className="font-semibold text-gray-300">Racha Victorias:</div><div className="font-bold text-right text-emerald-400">{metrics.streaks.winStreak}</div>
                        <div className="font-semibold text-gray-300">Racha Derrotas:</div><div className="font-bold text-right text-red-400">{metrics.streaks.lossStreak}</div>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-400 flex-grow flex items-center justify-center">No hay apuestas registradas.</div>
            )}
             {metrics && <button onClick={onViewHistory} className="w-full mt-4 py-2 text-sm font-semibold rounded-lg bg-[#3b4452]/70 hover:bg-[#4a5258] text-white transition-all duration-200">Ver Historial Completo</button>}
        </div>
    );
};


interface StatisticsProps {
    allStrategyStates: Record<Strategy, StrategyState>;
    riskSettings: RiskSettings;
}

const Statistics: React.FC<StatisticsProps> = ({ allStrategyStates, riskSettings }) => {
    const [viewingHistory, setViewingHistory] = useState<Strategy | null>(null);
    const [statsMode, setStatsMode] = useState<BettingMode>('docenas');
    const [dozenModeFilter, setDozenModeFilter] = useState<'single' | 'double' | 'all'>('all');


    // Use a representative session for overall stats (hibrido is fine)
    const overallSession = allStrategyStates.hibrido.bettingSession;
    const overallHistory = overallSession.history;
    const totalBets = overallHistory.length;
    const totalWins = overallHistory.filter(h => h.result === 'WIN').length;
    const totalLosses = totalBets - totalWins;
    const overallWinRate = totalBets > 0 ? (totalWins / totalBets) * 100 : 0;
    const overallProfitPercentage = riskSettings.startBalance > 0 ? (overallSession.totalProfit / riskSettings.startBalance) * 100 : 0;

    return (
        <>
            <div className="space-y-8 animate-fade-in">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-6 pb-3 border-b-2 border-white/10">Estadísticas Generales</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <StatsCard title="Total Apuestas" value={totalBets} />
                        <StatsCard title="Victorias" value={totalWins} valueClassName="text-emerald-400" />
                        <StatsCard title="Derrotas" value={totalLosses} valueClassName="text-red-400" />
                        <StatsCard title="Tasa de Victoria" value={`${overallWinRate.toFixed(1)}%`} />
                        <StatsCard title="% Ganancia Neta" value={`${overallProfitPercentage.toFixed(1)}%`} valueClassName={overallProfitPercentage >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-white mb-4">Análisis por Docena</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><DozenStats spinHistory={allStrategyStates.hibrido.spinHistory} /></div>
                </div>
                <div>
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                        <h3 className="text-2xl font-bold text-white mb-3 sm:mb-0">Análisis Detallado por Estrategia</h3>
                        <div className="flex items-center gap-2 p-1 rounded-lg bg-[#1a1f25]">
                            <button onClick={() => setStatsMode('docenas')} className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${statsMode === 'docenas' ? 'bg-[#f0b90b] text-black' : 'hover:bg-white/10'}`}>Docenas</button>
                            <button onClick={() => setStatsMode('mitades')} className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${statsMode === 'mitades' ? 'bg-[#f0b90b] text-black' : 'hover:bg-white/10'}`}>Mitades</button>
                        </div>
                    </div>
                     {statsMode === 'docenas' && (
                        <div className="flex justify-center items-center gap-2 p-1 rounded-lg bg-[#1a1f25] mb-4 max-w-sm mx-auto">
                            <button onClick={() => setDozenModeFilter('all')} className={`w-full px-3 py-1 text-xs font-semibold rounded-md transition-colors ${dozenModeFilter === 'all' ? 'bg-indigo-500 text-white' : 'hover:bg-white/10'}`}>Todas</button>
                            <button onClick={() => setDozenModeFilter('single')} className={`w-full px-3 py-1 text-xs font-semibold rounded-md transition-colors ${dozenModeFilter === 'single' ? 'bg-indigo-500 text-white' : 'hover:bg-white/10'}`}>Una Docena</button>
                            <button onClick={() => setDozenModeFilter('double')} className={`w-full px-3 py-1 text-xs font-semibold rounded-md transition-colors ${dozenModeFilter === 'double' ? 'bg-indigo-500 text-white' : 'hover:bg-white/10'}`}>Dos Docenas</button>
                        </div>
                     )}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {(Object.keys(allStrategyStates) as Strategy[]).map(strategy => {
                            const isStandardHalfStrategy = strategy.includes('mitad');
                            
                            if (statsMode === 'docenas' && isStandardHalfStrategy) {
                                return null;
                            }
                            
                            if (statsMode === 'mitades' && !isStandardHalfStrategy && !riskSettings.useAdvancedHalvesAnalysis) {
                                return null;
                            }
                            
                            let filteredHistory = allStrategyStates[strategy].bettingSession.history.filter(bet => bet.bettingMode === statsMode);
                             if (statsMode === 'docenas' && dozenModeFilter !== 'all') {
                                filteredHistory = filteredHistory.filter(bet => bet.dozenBettingMode === dozenModeFilter);
                            }
                            
                            return (
                                <StrategyAnalysisCard 
                                    key={strategy}
                                    strategyName={strategy}
                                    history={filteredHistory} 
                                    startBalance={riskSettings.startBalance}
                                    onViewHistory={() => setViewingHistory(strategy)}
                                />
                            )
                        })}
                    </div>
                </div>
            </div>
            {viewingHistory && (
                <HistoryModal 
                    strategy={viewingHistory} 
                    history={(() => {
                        let history = allStrategyStates[viewingHistory].bettingSession.history.filter(bet => bet.bettingMode === statsMode);
                        if (statsMode === 'docenas' && dozenModeFilter !== 'all') {
                            history = history.filter(bet => bet.dozenBettingMode === dozenModeFilter);
                        }
                        return history;
                    })()}
                    onClose={() => setViewingHistory(null)} 
                />
            )}
        </>
    );
};

export default Statistics;