import React from 'react';
import { StrategyState, RiskSettings, AnalysisResult, BettingMode, HistoryEntry, Strategy } from '../types';
import Controls from './Controls';
import { SpinHistory, BetHistoryTable } from './History';
import Analysis from './Analysis';

// --- Helper Components ---
const StatsSummary: React.FC<{ session: StrategyState['bettingSession']; settings: RiskSettings }> = ({ session, settings }) => {
    const profitPercentage = settings.startBalance > 0 ? (session.totalProfit / settings.startBalance) * 100 : 0;
    
    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-center">
            <div className="bg-[#2a313b]/50 p-4 rounded-xl border border-white/10">
                <div className="text-sm text-gray-400">Balance Actual</div>
                <div className="text-2xl font-bold text-white">{session.currentBalance.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}</div>
            </div>
            <div className="bg-[#2a313b]/50 p-4 rounded-xl border border-white/10">
                <div className="text-sm text-gray-400">Ganancia/Pérdida</div>
                <div className={`text-2xl font-bold ${session.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {session.totalProfit.toLocaleString('es-ES', { style: 'currency', currency: 'USD' })}
                </div>
            </div>
            <div className="bg-[#2a313b]/50 p-4 rounded-xl border border-white/10">
                <div className="text-sm text-gray-400">% Ganancia</div>
                 <div className={`text-2xl font-bold ${profitPercentage >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {profitPercentage.toFixed(2)}%
                </div>
            </div>
            <div className="bg-[#2a313b]/50 p-4 rounded-xl border border-white/10">
                <div className="text-sm text-gray-400">Ronda Actual</div>
                <div className="text-2xl font-bold text-white">{settings.isActive ? session.currentRound : 'N/A'}</div>
            </div>
            <div className="bg-[#2a313b]/50 p-4 rounded-xl border border-white/10 col-span-2 lg:col-span-1">
                <div className="text-sm text-gray-400">Pérdida Acum.</div>
                <div className="text-2xl font-bold text-red-400">
                    {session.accumulatedLoss > 0 ? session.accumulatedLoss.toLocaleString('es-ES', { style: 'currency', currency: 'USD' }) : '$0.00'}
                </div>
            </div>
        </div>
    );
};

interface DashboardProps {
    allStrategyStates: Record<Strategy, StrategyState>;
    viewedStrategy: Strategy;
    riskSettings: RiskSettings;
    analysisResult: AnalysisResult;
    bettingMode: BettingMode;
    calculatedBet: {
        mainBet: number;
        perDozen?: number;
        zeroBet: number;
        totalRisk: number;
        potentialProfit: number;
    } | null;
    onAddEntry: (outcome: HistoryEntry) => void;
    onUndo: () => void;
    isBettingActive: boolean;
    onToggleBetting: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
    allStrategyStates,
    viewedStrategy,
    riskSettings,
    analysisResult,
    bettingMode,
    calculatedBet,
    onAddEntry,
    onUndo,
    isBettingActive,
    onToggleBetting,
}) => {
    const displayedState = allStrategyStates[viewedStrategy] || allStrategyStates.hibrido;

    return (
        <div className="animate-fade-in">
            <header className="mb-6">
                <StatsSummary session={displayedState.bettingSession} settings={riskSettings} />
            </header>

            <div className="dashboard-grid">
                <aside className="dashboard-sidebar">
                    <Controls
                        onAddEntry={onAddEntry}
                        onUndo={onUndo}
                        isUndoDisabled={displayedState.spinHistory.length === 0}
                        isBettingActive={isBettingActive}
                        onToggleBetting={onToggleBetting}
                        isRiskEnabled={riskSettings.isActive}
                    />
                    <div className="flex-grow min-h-[300px]">
                        <SpinHistory history={displayedState.spinHistory} />
                    </div>
                </aside>

                <main className="dashboard-main">
                    <Analysis
                        result={analysisResult}
                        bettingMode={bettingMode}
                        calculatedBet={calculatedBet}
                        isRiskActive={riskSettings.isActive}
                    />
                    <div className="flex-grow">
                        <BetHistoryTable history={displayedState.bettingSession.history} />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;