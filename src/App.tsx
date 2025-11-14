import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import NavMenu from './components/NavMenu';
import Dashboard from './components/Dashboard';
import Statistics from './components/Statistics';
import SettingsModal from './components/SettingsModal';
import {
    HistoryEntry,
    Strategy,
    BettingMode,
    RiskSettings,
    AppView,
    StrategyState,
    BettingSession,
    AnalysisResult,
    Frequencies,
    BetHistoryEntry,
    Dozen,
    Half,
} from './types';


// --- Core Logic ---
const deepCopy = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

const calculateFrequencies = (history: HistoryEntry[]): Frequencies => {
    const counts: Frequencies['counts'] = { D1: 0, D2: 0, D3: 0, Cero: 0 };
    history.forEach(entry => {
        if (entry in counts) {
            counts[entry]++;
        }
    });

    const dozenEntries = (['D1', 'D2', 'D3'] as Dozen[]).map(d => ({ dozen: d, count: counts[d] }));
    dozenEntries.sort((a, b) => a.count - b.count);
    
    const cold = dozenEntries.length > 0 ? [dozenEntries[0].dozen] : [];
    const hot = dozenEntries.length > 0 ? [dozenEntries[dozenEntries.length - 1].dozen] : [];

    return { counts, hot, cold };
};

const runSingleStrategyAnalysis = (history: HistoryEntry[], strategy: Strategy, bettingMode: BettingMode, useAdvancedHalves: boolean): AnalysisResult => {
    const frequencies = calculateFrequencies(history);
    let play: string = 'Esperar';
    let reason = 'No hay una señal clara según la estrategia.';
    let isBettingOpportunity = false;
    
    if (history.length < 5) {
        return {
            play: 'Esperando más datos...',
            reason: 'Se necesitan al menos 5 giros para un análisis inicial.',
            frequencies,
            isBettingOpportunity: false,
        };
    }
    
    const allDozens: Dozen[] = ['D1', 'D2', 'D3'];
    
    // NEW: Handle dozen strategies when in advanced halves mode
    if (bettingMode === 'mitades' && useAdvancedHalves && !strategy.includes('mitad')) {
         const halfCounts = { '1-18': 0, '19-36': 0 };
         history.forEach(spin => {
            if(spin === 'D1') halfCounts['1-18']++;
            else if (spin === 'D3') halfCounts['19-36']++;
         });
         
         switch(strategy) {
            case 'hibrido':
            case 'frio': {
                play = halfCounts['1-18'] <= halfCounts['19-36'] ? '1-18' : '19-36';
                reason = `Corrección de Mitad (vía ${strategy}): Apostando a la mitad más fría (${play}).`;
                isBettingOpportunity = true;
                break;
            }
            case 'caliente': {
                play = halfCounts['1-18'] >= halfCounts['19-36'] ? '1-18' : '19-36';
                reason = `Tendencia de Mitad (vía ${strategy}): Apostando a la mitad más caliente (${play}).`;
                isBettingOpportunity = true;
                break;
            }
            case 'seguidor': {
                const lastDozenSpin = history.find(s => s !== 'Cero');
                if (!lastDozenSpin) {
                    reason = 'No hay historial de docenas para la estrategia seguidor.';
                    break;
                }
                if (lastDozenSpin === 'D1') {
                    play = '19-36';
                    reason = `Seguidor de Mitad: El último fue '1-18' (D1), apostando al opuesto.`;
                    isBettingOpportunity = true;
                } else if (lastDozenSpin === 'D3') {
                    play = '1-18';
                    reason = `Seguidor de Mitad: El último fue '19-36' (D3), apostando al opuesto.`;
                    isBettingOpportunity = true;
                } else { // D2
                     reason = `Seguidor de Mitad: El último fue D2, que es neutral. Esperando.`;
                }
                break;
            }
            case 'durmiente': {
                const SLEEP_THRESHOLD = 7;
                 if (history.length < SLEEP_THRESHOLD) {
                    reason = `Se necesitan ${SLEEP_THRESHOLD} giros para la estrategia Durmiente en mitades.`;
                    break;
                }
                const recentSpins = history.slice(0, SLEEP_THRESHOLD);
                const sawD1 = recentSpins.includes('D1');
                const sawD3 = recentSpins.includes('D3');

                if (!sawD1 && sawD3) {
                    play = '1-18';
                    reason = `Durmiente de Mitad: '1-18' (D1) no ha salido en ${SLEEP_THRESHOLD} giros.`;
                    isBettingOpportunity = true;
                } else if (sawD1 && !sawD3) {
                    play = '19-36';
                    reason = `Durmiente de Mitad: '19-36' (D3) no ha salido en ${SLEEP_THRESHOLD} giros.`;
                    isBettingOpportunity = true;
                } else {
                    reason = 'No hay una única mitad "durmiente" clara.';
                }
                break;
            }
         }
        return { play, reason, frequencies, isBettingOpportunity };
    }


    switch(strategy) {
        case 'frio': {
            const suggestedDozen = frequencies.cold[0];
            const betOnDozens = allDozens.filter(d => d !== suggestedDozen);
            play = betOnDozens.join(' y ');
            reason = `Estrategia de Corrección: Apostar a las docenas que no son la más fría (${suggestedDozen}).`;
            isBettingOpportunity = true;
            break;
        }
        case 'caliente': {
            const suggestedDozen = frequencies.hot[0];
            const betOnDozens = allDozens.filter(d => d !== suggestedDozen);
            play = betOnDozens.join(' y ');
            reason = `Estrategia de Tendencia: Evitar la docena más caliente (${suggestedDozen}).`;
             isBettingOpportunity = true;
            break;
        }
        case 'durmiente': {
            const SLEEP_THRESHOLD = 7;
            if (history.length < SLEEP_THRESHOLD) {
                reason = `Se necesitan ${SLEEP_THRESHOLD} giros para la estrategia Durmiente.`;
                break;
            }
            const recentSpins = history.slice(0, SLEEP_THRESHOLD);
            const seenDozens = new Set(recentSpins.filter(s => s !== 'Cero'));
            const sleepingDozens = allDozens.filter(d => !seenDozens.has(d));

            if (sleepingDozens.length === 1) {
                const sleepingDozen = sleepingDozens[0];
                const betOnDozens = allDozens.filter(d => d !== sleepingDozen);
                play = betOnDozens.join(' y ');
                reason = `Estrategia Durmiente: ${sleepingDozen} no ha salido en ${SLEEP_THRESHOLD} giros. Apostar al resto.`;
                isBettingOpportunity = true;
            } else {
                reason = 'No hay una única docena "durmiente" clara.';
            }
            break;
        }
        case 'seguidor': {
            if (history.length === 0 || history[0] === 'Cero') {
                 reason = 'El último giro fue Cero o no hay historial, esperando una docena.';
                 break;
            }
            const lastDozen = history[0];
            const betOnDozens = allDozens.filter(d => d !== lastDozen);
            play = betOnDozens.join(' y ');
            reason = `Estrategia Seguidor: Evitando la última docena que salió (${lastDozen}).`;
            isBettingOpportunity = true;
            break;
        }
        case 'mitad-fria': {
            const halfCounts = { '1-18': 0, '19-36': 0 };
            history.forEach(spin => {
                if(spin === 'D1') halfCounts['1-18']++;
                else if (spin === 'D3') halfCounts['19-36']++;
                // D2 is ignored for halves analysis
            });
            play = halfCounts['1-18'] <= halfCounts['19-36'] ? '1-18' : '19-36';
            reason = `Corrección de Mitad: Apostando a la mitad más fría (${play}).`;
            isBettingOpportunity = true;
            break;
        }
        case 'mitad-caliente': {
             const halfCounts = { '1-18': 0, '19-36': 0 };
            history.forEach(spin => {
                if(spin === 'D1') halfCounts['1-18']++;
                else if (spin === 'D3') halfCounts['19-36']++;
            });
            play = halfCounts['1-18'] >= halfCounts['19-36'] ? '1-18' : '19-36';
            reason = `Tendencia de Mitad: Apostando a la mitad más caliente (${play}).`;
            isBettingOpportunity = true;
            break;
        }
        case 'hibrido':
        default: {
             const suggestedDozen = frequencies.cold[0] || 'D1';
             const betOnDozens = allDozens.filter(d => d !== suggestedDozen);
             play = betOnDozens.join(' y ');
             reason = `Estrategia Híbrida: Apostando a las docenas que no son la más fría (${suggestedDozen}).`;
             isBettingOpportunity = true;
             break;
        }
    }

    return { play, reason, frequencies, isBettingOpportunity };
};

const runConsensusAnalysis = (history: HistoryEntry[], settings: RiskSettings, bettingMode: BettingMode): AnalysisResult => {
    const { analysisWindow, activeStrategies, useAdvancedHalvesAnalysis } = settings;
    
    const analysisHistory = history.slice(0, analysisWindow);
    const frequencies = calculateFrequencies(analysisHistory);

    if (analysisHistory.length < 5) {
        return {
            play: 'Esperando más datos...',
            reason: `Se necesitan al menos 5 giros (de ${analysisWindow} en ventana) para un análisis.`,
            frequencies,
            isBettingOpportunity: false,
        };
    }

    if (!activeStrategies || activeStrategies.length === 0) {
        return {
            play: 'Ninguna estrategia activa',
            reason: 'Por favor, active al menos una estrategia en la configuración.',
            frequencies,
            isBettingOpportunity: false,
        };
    }

    const suggestions: { play: string; strategy: Strategy }[] = [];
    activeStrategies.forEach(strategy => {
        const result = runSingleStrategyAnalysis(analysisHistory, strategy, bettingMode, useAdvancedHalvesAnalysis);
        if (result.isBettingOpportunity) {
            suggestions.push({ play: result.play, strategy });
        }
    });

    if (suggestions.length === 0) {
        return {
            play: 'Esperar',
            reason: 'Ninguna estrategia activa encontró una oportunidad de apuesta clara.',
            frequencies,
            isBettingOpportunity: false,
        };
    }

    const votes: Record<string, { count: number; strategies: Strategy[] }> = {};
    suggestions.forEach(({ play, strategy }) => {
        if (!votes[play]) {
            votes[play] = { count: 0, strategies: [] };
        }
        votes[play].count++;
        votes[play].strategies.push(strategy);
    });

    const sortedPlays = Object.entries(votes).sort((a, b) => b[1].count - a[1].count);
    
    if (sortedPlays.length > 1 && sortedPlays[0][1].count === sortedPlays[1][1].count) {
        return {
            play: 'Conflicto de Estrategias',
            reason: 'Múltiples sugerencias con el mismo apoyo. No hay un consenso claro.',
            frequencies,
            isBettingOpportunity: false,
        };
    }

    const winningPlay = sortedPlays[0][0];
    const winningVote = sortedPlays[0][1];
    
    const reason = `Consenso de ${winningVote.count} estrategia(s) (${winningVote.strategies.join(', ')}): Sugieren ${winningPlay}.`;

    return {
        play: winningPlay,
        reason,
        frequencies,
        isBettingOpportunity: true,
    };
};


const calculateBet = (
    analysis: AnalysisResult,
    session: BettingSession,
    settings: RiskSettings,
    bettingMode: BettingMode
): { mainBet: number; perDozen?: number; zeroBet: number; totalRisk: number; potentialProfit: number } | null => {
    if (!settings.isActive || !analysis.isBettingOpportunity || analysis.play === 'Esperar' || analysis.play.includes('Conflicto')) {
        return null;
    }

    let mainBet = session.accumulatedLoss > 0
        ? (session.accumulatedLoss + (settings.isSecureGain ? settings.desiredGain : settings.initialBet))
        : settings.initialBet;

    let odds;
    let numBets = 1; // Default to 1 bet (for halves)
    
    if (bettingMode === 'mitades') {
        odds = settings.oddsHalf;
        numBets = 1;
    } else { // 'docenas'
        odds = settings.oddsDoubleDozen;
        numBets = 2; // Always betting on two dozens
    }
    
    mainBet = Math.max(mainBet / (odds), settings.initialBet);
    
    const perDozen = bettingMode === 'docenas' ? mainBet / numBets : undefined;
    
    // Round to nearest chip value
    if (perDozen) {
       mainBet = Math.ceil(perDozen / settings.minChip) * settings.minChip * numBets;
    } else {
       mainBet = Math.ceil(mainBet / settings.minChip) * settings.minChip;
    }
    
    let zeroBet = 0;
    if (settings.isCoverZero && session.currentBalance >= session.nextZeroBetThreshold) {
        zeroBet = mainBet / settings.zeroThreshold;
        zeroBet = Math.ceil(zeroBet / settings.minChip) * settings.minChip;
    }
    
    const totalRisk = mainBet + zeroBet;
    const potentialProfit = (perDozen ? perDozen * (settings.oddsSingleDozen + 1) : mainBet * (odds + 1)) - totalRisk;

    return { mainBet, perDozen, zeroBet, totalRisk, potentialProfit };
};

// --- Initial State Definitions ---
const INITIAL_RISK_SETTINGS: RiskSettings = {
    isActive: false,
    initialBet: 1,
    minChip: 0.1,
    isSecureGain: false,
    desiredGain: 5,
    isCoverZero: false,
    zeroThreshold: 10,
    zeroPayout: 35,
    startBalance: 100,
    oddsSingleDozen: 2,
    oddsDoubleDozen: 0.5,
    oddsHalf: 1,
    useAdvancedHalvesAnalysis: false,
    analysisWindow: 60,
    activeStrategies: ['hibrido'],
};

const INITIAL_ANALYSIS_RESULT: AnalysisResult = {
    play: 'N/A',
    reason: 'Añada una entrada para comenzar.',
    frequencies: {
        counts: { D1: 0, D2: 0, D3: 0, Cero: 0 },
        hot: [],
        cold: [],
    },
    isBettingOpportunity: false,
};

const getInitialBettingSession = (startBalance: number): BettingSession => ({
    currentRound: 1,
    accumulatedLoss: 0,
    totalProfit: 0,
    history: [],
    currentBalance: startBalance,
    nextZeroBetThreshold: startBalance,
});


function App() {
    const [riskSettings, setRiskSettings] = useState<RiskSettings>(INITIAL_RISK_SETTINGS);
    
    const [allStrategyStates, setAllStrategyStates] = useState<Record<Strategy, StrategyState>>(() => {
        const initialSession = getInitialBettingSession(riskSettings.startBalance);
        const initialState: StrategyState = { spinHistory: [], bettingSession: initialSession };
        return {
            hibrido: deepCopy(initialState),
            frio: deepCopy(initialState),
            caliente: deepCopy(initialState),
            durmiente: deepCopy(initialState),
            seguidor: deepCopy(initialState),
            'mitad-fria': deepCopy(initialState),
            'mitad-caliente': deepCopy(initialState),
        };
    });

    const [bettingMode, setBettingMode] = useState<BettingMode>('docenas');
    const [currentView, setCurrentView] = useState<AppView>('dashboard');

    const [isNavOpen, setIsNavOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isBettingActive, setIsBettingActive] = useState(false);

    const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(INITIAL_ANALYSIS_RESULT);
    const [calculatedBet, setCalculatedBet] = useState<ReturnType<typeof calculateBet>>(null);
    
    // For display purposes on the dashboard (spin history etc), we can use a representative state.
    // The actual bet simulation runs on all states independently.
    const activeState = allStrategyStates.hibrido;

    useEffect(() => {
        const newAnalysis = runConsensusAnalysis(activeState.spinHistory, riskSettings, bettingMode);
        setAnalysisResult(newAnalysis);
    }, [activeState.spinHistory, riskSettings, bettingMode]);
    
    useEffect(() => {
        const newBet = calculateBet(analysisResult, activeState.bettingSession, riskSettings, bettingMode);
        setCalculatedBet(newBet);
    }, [analysisResult, activeState.bettingSession, riskSettings, bettingMode]);
    
    useEffect(() => {
        if (riskSettings.isActive) {
            setAllStrategyStates(prev => {
                const newStates = deepCopy(prev);
                (Object.keys(newStates) as Strategy[]).forEach(s => {
                    if (newStates[s].bettingSession.history.length === 0) {
                         newStates[s].bettingSession.currentBalance = riskSettings.startBalance;
                         newStates[s].bettingSession.nextZeroBetThreshold = riskSettings.startBalance - riskSettings.zeroThreshold;
                    }
                });
                return newStates;
            });
        }
    }, [riskSettings.startBalance, riskSettings.isActive, riskSettings.zeroThreshold]);

    const handleAddEntry = useCallback((outcome: HistoryEntry) => {
        setAllStrategyStates(prevStates => {
            const newStates = deepCopy(prevStates);
            
            (Object.keys(newStates) as Strategy[]).forEach(s => {
                const strategy = s as Strategy;
                const state = newStates[strategy];
                
                const analysisHistory = state.spinHistory.slice(0, riskSettings.analysisWindow);
                const isStandardHalfStrategy = strategy.includes('mitad');
                const isDozenStrategyInHalfMode = !isStandardHalfStrategy && riskSettings.useAdvancedHalvesAnalysis;
                const currentBettingModeForStrategy = (isStandardHalfStrategy || isDozenStrategyInHalfMode) ? 'mitades' : 'docenas';
                
                if (riskSettings.isActive && isBettingActive && state.bettingSession.history.length < state.spinHistory.length + 1) {
                    const lastAnalysis = runSingleStrategyAnalysis(analysisHistory, strategy, currentBettingModeForStrategy, riskSettings.useAdvancedHalvesAnalysis);
                    const lastBet = calculateBet(lastAnalysis, state.bettingSession, riskSettings, currentBettingModeForStrategy);

                    if (lastBet && lastAnalysis.isBettingOpportunity) {
                        const { totalRisk, mainBet, zeroBet, potentialProfit } = lastBet;
                        let result: 'WIN' | 'LOSS' = 'LOSS';
                        let profit = -totalRisk;

                        if (outcome === 'Cero') {
                           if (zeroBet > 0) {
                               profit = (zeroBet * (riskSettings.zeroPayout + 1)) - totalRisk;
                               result = profit > 0 ? 'WIN' : 'LOSS';
                           }
                        } else {
                            if (currentBettingModeForStrategy === 'docenas') {
                                const winningDozens = lastAnalysis.play.split(' y ') as Dozen[];
                                if (winningDozens.includes(outcome as Dozen)) {
                                    result = 'WIN';
                                    profit = potentialProfit;
                                }
                            } else { // mitades
                                 if (lastAnalysis.play === '1-18' && outcome === 'D1') {
                                     result = 'WIN';
                                     profit = potentialProfit;
                                } else if (lastAnalysis.play === '19-36' && outcome === 'D3') {
                                     result = 'WIN';
                                     profit = potentialProfit;
                                }
                            }
                        }
                        
                        const newBalance = state.bettingSession.currentBalance + profit;

                        const betEntry: BetHistoryEntry = {
                            round: state.bettingSession.currentRound,
                            suggestion: lastAnalysis.play,
                            betAmount: mainBet,
                            zeroBetAmount: zeroBet,
                            totalRisk: totalRisk,
                            outcome: outcome,
                            result: result,
                            profit: profit,
                            balance: newBalance,
                            bettingMode: currentBettingModeForStrategy,
                        };
                        
                        state.bettingSession.history.unshift(betEntry);
                        state.bettingSession.currentBalance = newBalance;
                        state.bettingSession.totalProfit += profit;
                        state.bettingSession.currentRound += 1;
                        if (result === 'LOSS') {
                            state.bettingSession.accumulatedLoss += totalRisk;
                        } else {
                            state.bettingSession.accumulatedLoss = 0;
                            state.bettingSession.nextZeroBetThreshold = newBalance - riskSettings.zeroThreshold;
                        }
                    }
                }
                
                state.spinHistory.unshift(outcome);
            });
            
            return newStates;
        });
    }, [riskSettings, isBettingActive]);

    const handleUndo = useCallback(() => {
        setAllStrategyStates(prevStates => {
             const newStates = deepCopy(prevStates);
             (Object.keys(newStates) as Strategy[]).forEach(s => {
                const state = newStates[s as Strategy];
                if (state.spinHistory.length > 0) {
                    const lastOutcome = state.spinHistory[0];
                    state.spinHistory.shift();

                    if (riskSettings.isActive && state.bettingSession.history.length > 0) {
                        const lastBet = state.bettingSession.history[0];
                        if (lastBet.outcome === lastOutcome && (state.bettingSession.history.length === state.spinHistory.length + 1)) {
                            state.bettingSession.history.shift();
                            state.bettingSession.currentBalance -= lastBet.profit;
                            state.bettingSession.totalProfit -= lastBet.profit;
                            state.bettingSession.currentRound -= 1;
                            
                            // This is complex to revert accurately, simplified for now
                             if (lastBet.result === 'LOSS') {
                                state.bettingSession.accumulatedLoss -= lastBet.totalRisk;
                            } else {
                                state.bettingSession.accumulatedLoss = 0; // Simplified
                            }
                        }
                    }
                }
             });
             return newStates;
        });
    }, [riskSettings.isActive]);

    const handleResetSession = useCallback(() => {
        setAllStrategyStates(prev => {
            const newStates = deepCopy(prev);
            (Object.keys(newStates) as Strategy[]).forEach(s => {
                newStates[s].bettingSession = getInitialBettingSession(riskSettings.startBalance);
            });
            return newStates;
        });
        setIsBettingActive(false); // Also pause betting on reset
    }, [riskSettings.startBalance]);
    
    const handleNavigate = (view: AppView) => {
        setCurrentView(view);
        setIsNavOpen(false);
    }
    
    const handleSetBettingMode = (mode: BettingMode) => {
        setBettingMode(mode);
        setRiskSettings(prev => {
            const newSettings = {...prev};
            const currentActive = newSettings.activeStrategies;
            
            if (mode === 'docenas') {
                 const newActive = currentActive.filter(s => !s.includes('mitad'));
                 if (newActive.length === 0) newActive.push('hibrido');
                 newSettings.activeStrategies = newActive;
            } else {
                if (!newSettings.useAdvancedHalvesAnalysis) {
                    const newActive = currentActive.filter(s => s.includes('mitad'));
                    if (newActive.length === 0) newActive.push('mitad-fria');
                    newSettings.activeStrategies = newActive;
                }
            }
            return newSettings;
        });
    }

    return (
        <div className="bg-[#1a1f25] text-white min-h-screen font-sans">
            <Header onToggleNav={() => setIsNavOpen(true)} />
            <NavMenu 
                isOpen={isNavOpen} 
                onClose={() => setIsNavOpen(false)} 
                onNavigate={handleNavigate}
                onOpenSettings={() => setIsSettingsOpen(true)}
                currentView={currentView}
            />
            <main className="p-4 sm:p-6 lg:p-8">
                {currentView === 'dashboard' && (
                    <Dashboard 
                        activeState={activeState}
                        riskSettings={riskSettings}
                        analysisResult={analysisResult}
                        bettingMode={bettingMode}
                        calculatedBet={calculatedBet}
                        onAddEntry={handleAddEntry}
                        onUndo={handleUndo}
                        isBettingActive={isBettingActive}
                        onToggleBetting={() => setIsBettingActive(prev => !prev)}
                    />
                )}
                {currentView === 'statistics' && (
                    <Statistics 
                        allStrategyStates={allStrategyStates}
                        riskSettings={riskSettings}
                    />
                )}
            </main>
            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                bettingMode={bettingMode}
                onSetBettingMode={handleSetBettingMode}
                riskSettings={riskSettings}
                onSetRiskSettings={setRiskSettings}
                onResetSession={handleResetSession}
            />
        </div>
    );
}

export default App;