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
    const internalCounts: Record<HistoryEntry, number> = { D1: 0, D2H1: 0, D2H2: 0, D3: 0, Cero: 0 };
    history.forEach(entry => {
        if (entry in internalCounts) {
            internalCounts[entry]++;
        }
    });

    const counts: Frequencies['counts'] = {
        D1: internalCounts.D1,
        D2: internalCounts.D2H1 + internalCounts.D2H2,
        D3: internalCounts.D3,
        Cero: internalCounts.Cero
    };

    const dozenEntries = (['D1', 'D2', 'D3'] as Dozen[]).map(d => ({ dozen: d, count: counts[d] }));
    dozenEntries.sort((a, b) => a.count - b.count);
    
    const cold = dozenEntries.length > 0 ? [dozenEntries[0].dozen] : [];
    const hot = dozenEntries.length > 0 ? [dozenEntries[dozenEntries.length - 1].dozen] : [];

    return { counts, hot, cold };
};

const runSingleStrategyAnalysis = (history: HistoryEntry[], strategy: Strategy, bettingMode: BettingMode, useAdvancedHalves: boolean, dozenBettingMode: 'single' | 'double'): AnalysisResult => {
    const frequencies = calculateFrequencies(history);
    let play: string = 'Esperar';
    let reason = 'No hay una señal clara según la estrategia.';
    let isBettingOpportunity = false;
    const analysisWindowSize = history.length;
    
    if (history.length < 5) {
        return {
            play: 'Esperando más datos...',
            reason: 'Se necesitan al menos 5 giros para un análisis inicial.',
            frequencies,
            isBettingOpportunity: false,
            analysisWindowSize,
        };
    }
    
    const allDozens: Dozen[] = ['D1', 'D2', 'D3'];
    
    // NEW: Handle dozen strategies when in advanced halves mode
    if (bettingMode === 'mitades' && useAdvancedHalves && !strategy.includes('mitad')) {
         const halfCounts = { '1-18': 0, '19-36': 0 };
         history.forEach(spin => {
            if(spin === 'D1' || spin === 'D2H1') halfCounts['1-18']++;
            else if (spin === 'D3' || spin === 'D2H2') halfCounts['19-36']++;
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
                if (lastDozenSpin === 'D1' || lastDozenSpin === 'D2H1') { // First half
                    play = '19-36';
                    reason = `Seguidor de Mitad: El último fue '1-18', apostando al opuesto.`;
                    isBettingOpportunity = true;
                } else if (lastDozenSpin === 'D3' || lastDozenSpin === 'D2H2') { // Second half
                    play = '1-18';
                    reason = `Seguidor de Mitad: El último fue '19-36', apostando al opuesto.`;
                    isBettingOpportunity = true;
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
                const sawFirstHalf = recentSpins.some(s => s === 'D1' || s === 'D2H1');
                const sawSecondHalf = recentSpins.some(s => s === 'D3' || s === 'D2H2');

                if (!sawFirstHalf && sawSecondHalf) {
                    play = '1-18';
                    reason = `Durmiente de Mitad: '1-18' no ha salido en ${SLEEP_THRESHOLD} giros.`;
                    isBettingOpportunity = true;
                } else if (sawFirstHalf && !sawSecondHalf) {
                    play = '19-36';
                    reason = `Durmiente de Mitad: '19-36' no ha salido en ${SLEEP_THRESHOLD} giros.`;
                    isBettingOpportunity = true;
                } else {
                    reason = 'No hay una única mitad "durmiente" clara.';
                }
                break;
            }
         }
        return { play, reason, frequencies, isBettingOpportunity, analysisWindowSize };
    }


    switch(strategy) {
        case 'frio': {
            const suggestedDozen = frequencies.cold[0];
            if (dozenBettingMode === 'single') {
                play = suggestedDozen;
                reason = `Estrategia de Corrección: Apostar a la docena más fría (${suggestedDozen}).`;
            } else {
                const betOnDozens = allDozens.filter(d => d !== suggestedDozen);
                play = betOnDozens.join(' y ');
                reason = `Estrategia de Corrección: Apostar a las docenas que no son la más fría (${suggestedDozen}).`;
            }
            isBettingOpportunity = true;
            break;
        }
        case 'caliente': {
            const suggestedDozen = frequencies.hot[0];
            if (dozenBettingMode === 'single') {
                play = suggestedDozen;
                reason = `Estrategia de Tendencia: Apostar a la docena más caliente (${suggestedDozen}) para seguir la racha.`;
            } else {
                const betOnDozens = allDozens.filter(d => d !== suggestedDozen);
                play = betOnDozens.join(' y ');
                reason = `Estrategia Anti-Tendencia: Apostar a que la racha de la docena más caliente (${suggestedDozen}) se romperá.`;
            }
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
            const seenDozens = new Set<Dozen>();
            recentSpins.forEach(s => {
                if (s === 'D1') seenDozens.add('D1');
                if (s === 'D2H1' || s === 'D2H2') seenDozens.add('D2');
                if (s === 'D3') seenDozens.add('D3');
            });

            const sleepingDozens = allDozens.filter(d => !seenDozens.has(d));

            if (sleepingDozens.length === 1) {
                const sleepingDozen = sleepingDozens[0];
                if (dozenBettingMode === 'single') {
                    play = sleepingDozen;
                    reason = `Estrategia Durmiente: ${sleepingDozen} no ha salido en ${SLEEP_THRESHOLD} giros. Apostar a ella.`;
                } else {
                    const betOnDozens = allDozens.filter(d => d !== sleepingDozen);
                    play = betOnDozens.join(' y ');
                    reason = `Estrategia Durmiente: ${sleepingDozen} no ha salido en ${SLEEP_THRESHOLD} giros. Apostar al resto.`;
                }
                isBettingOpportunity = true;
            } else {
                reason = 'No hay una única docena "durmiente" clara.';
            }
            break;
        }
        case 'seguidor': {
            const lastSpin = history.find(s => s !== 'Cero');
            if (!lastSpin) {
                 reason = 'No hay historial de docenas para la estrategia seguidor.';
                 break;
            }
            let lastDozen: Dozen;
            if (lastSpin === 'D1') lastDozen = 'D1';
            else if (lastSpin === 'D2H1' || lastSpin === 'D2H2') lastDozen = 'D2';
            else lastDozen = 'D3';

            if (dozenBettingMode === 'single') {
                play = lastDozen;
                reason = `Estrategia Seguidor: Apostando a la última docena que salió (${lastDozen}).`;
            } else {
                const betOnDozens = allDozens.filter(d => d !== lastDozen);
                play = betOnDozens.join(' y ');
                reason = `Estrategia Seguidor: Evitando la última docena que salió (${lastDozen}).`;
            }
            isBettingOpportunity = true;
            break;
        }
        case 'mitad-fria': {
            const halfCounts = { '1-18': 0, '19-36': 0 };
            history.forEach(spin => {
                if(spin === 'D1' || spin === 'D2H1') halfCounts['1-18']++;
                else if (spin === 'D3' || spin === 'D2H2') halfCounts['19-36']++;
            });
            play = halfCounts['1-18'] <= halfCounts['19-36'] ? '1-18' : '19-36';
            reason = `Corrección de Mitad: Apostando a la mitad más fría (${play}).`;
            isBettingOpportunity = true;
            break;
        }
        case 'mitad-caliente': {
            const halfCounts = { '1-18': 0, '19-36': 0 };
            history.forEach(spin => {
                if(spin === 'D1' || spin === 'D2H1') halfCounts['1-18']++;
                else if (spin === 'D3' || spin === 'D2H2') halfCounts['19-36']++;
            });
            play = halfCounts['1-18'] >= halfCounts['19-36'] ? '1-18' : '19-36';
            reason = `Tendencia de Mitad: Apostando a la mitad más caliente (${play}).`;
            isBettingOpportunity = true;
            break;
        }
        case 'hibrido':
        default: {
             const suggestedDozen = frequencies.cold[0] || 'D1';
             if (dozenBettingMode === 'single') {
                 play = suggestedDozen;
                 reason = `Estrategia Híbrida: Apostando a la docena más fría (${suggestedDozen}).`;
             } else {
                 const betOnDozens = allDozens.filter(d => d !== suggestedDozen);
                 play = betOnDozens.join(' y ');
                 reason = `Estrategia Híbrida: Apostando a las docenas que no son la más fría (${suggestedDozen}).`;
             }
             isBettingOpportunity = true;
             break;
        }
    }

    return { play, reason, frequencies, isBettingOpportunity, analysisWindowSize };
};

const runConsensusAnalysis = (history: HistoryEntry[], settings: RiskSettings, bettingMode: BettingMode): AnalysisResult => {
    const { analysisWindow, activeStrategies, useAdvancedHalvesAnalysis, dozenBettingMode } = settings;
    
    const analysisHistory = history.slice(0, analysisWindow);
    const frequencies = calculateFrequencies(analysisHistory);
    const analysisWindowSize = analysisHistory.length;

    if (analysisHistory.length < 5) {
        return {
            play: 'Esperando más datos...',
            reason: `Se necesitan al menos 5 giros (de ${analysisWindow} en ventana) para un análisis.`,
            frequencies,
            isBettingOpportunity: false,
            analysisWindowSize,
        };
    }

    if (!activeStrategies || activeStrategies.length === 0) {
        return {
            play: 'Ninguna estrategia activa',
            reason: 'Por favor, active al menos una estrategia en la configuración.',
            frequencies,
            isBettingOpportunity: false,
            analysisWindowSize,
        };
    }

    const suggestions: { play: string; strategy: Strategy }[] = [];
    activeStrategies.forEach(strategy => {
        const result = runSingleStrategyAnalysis(analysisHistory, strategy, bettingMode, useAdvancedHalvesAnalysis, dozenBettingMode);
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
            analysisWindowSize,
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
            analysisWindowSize,
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
        analysisWindowSize,
    };
};


const calculateBet = (
    analysis: AnalysisResult,
    session: BettingSession,
    settings: RiskSettings,
    bettingMode: BettingMode,
    dozenBettingMode: 'single' | 'double'
): { mainBet: number; perDozen?: number; zeroBet: number; totalRisk: number; potentialProfit: number } | null => {
    if (!settings.isActive || !analysis.isBettingOpportunity || analysis.play === 'Esperar' || analysis.play.includes('Conflicto')) {
        return null;
    }

    let mainBet = session.accumulatedLoss > 0
        ? (session.accumulatedLoss + (settings.isSecureGain ? settings.desiredGain : settings.initialBet))
        : settings.initialBet;

    let odds;
    let numBets = 1;
    
    if (bettingMode === 'mitades') {
        odds = settings.oddsHalf;
        numBets = 1;
    } else { // 'docenas'
        if (dozenBettingMode === 'single') {
            odds = settings.oddsSingleDozen;
            numBets = 1;
        } else { // 'double'
            odds = settings.oddsDoubleDozen;
            numBets = 2;
        }
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
    const unitBet = mainBet / numBets;
    const potentialProfit = unitBet * (settings.oddsSingleDozen + 1) - totalRisk;


    return { mainBet, perDozen: perDozen, zeroBet, totalRisk, potentialProfit };
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
    dozenBettingMode: 'double',
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
    analysisWindowSize: 0,
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
        const strategies = [
            'hibrido', 'frio', 'caliente', 'durmiente', 'seguidor',
            'mitad-fria', 'mitad-caliente'
        ] as Strategy[];

        const initialStates: Record<Strategy, StrategyState> = {} as any;

        strategies.forEach(strategy => {
            const isStandardHalfStrategy = strategy.includes('mitad');
            const bettingSessions: Record<string, BettingSession> = {};
            
            if (isStandardHalfStrategy) {
                bettingSessions['mitades_standard'] = getInitialBettingSession(INITIAL_RISK_SETTINGS.startBalance);
            } else {
                bettingSessions['docenas_single'] = getInitialBettingSession(INITIAL_RISK_SETTINGS.startBalance);
                bettingSessions['docenas_double'] = getInitialBettingSession(INITIAL_RISK_SETTINGS.startBalance);
                bettingSessions['mitades_advanced'] = getInitialBettingSession(INITIAL_RISK_SETTINGS.startBalance);
            }

            initialStates[strategy] = {
                spinHistory: [],
                bettingSessions: bettingSessions,
            };
        });

        return initialStates;
    });

    const [bettingMode, setBettingMode] = useState<BettingMode>('docenas');
    const [currentView, setCurrentView] = useState<AppView>('dashboard');
    const viewedStrategy = riskSettings.activeStrategies[0] || 'hibrido';

    const [isNavOpen, setIsNavOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isBettingActive, setIsBettingActive] = useState(false);

    const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(INITIAL_ANALYSIS_RESULT);
    const [calculatedBet, setCalculatedBet] = useState<ReturnType<typeof calculateBet>>(null);
    
    // For consensus analysis, we use a representative history ('hibrido' is fine, as all spin histories are the same)
    const representativeSpinHistory = allStrategyStates.hibrido.spinHistory;

    useEffect(() => {
        const newAnalysis = runConsensusAnalysis(representativeSpinHistory, riskSettings, bettingMode);
        setAnalysisResult(newAnalysis);
    }, [representativeSpinHistory, riskSettings, bettingMode]);
    
    useEffect(() => {
        const getActiveSessionForView = (): BettingSession => {
            const state = allStrategyStates[viewedStrategy] || allStrategyStates.hibrido;
            const sessions = state.bettingSessions;
            const isStandardHalf = viewedStrategy.includes('mitad');

            if (bettingMode === 'mitades') {
                return isStandardHalf ? sessions.mitades_standard : sessions.mitades_advanced;
            }
            return riskSettings.dozenBettingMode === 'single' ? sessions.docenas_single : sessions.docenas_double;
        };

        const viewedSession = getActiveSessionForView();
        const newBet = calculateBet(analysisResult, viewedSession, riskSettings, bettingMode, riskSettings.dozenBettingMode);
        setCalculatedBet(newBet);
    }, [analysisResult, allStrategyStates, viewedStrategy, riskSettings, bettingMode]);
    
    useEffect(() => {
        if (riskSettings.isActive) {
            setAllStrategyStates(prev => {
                const newStates = deepCopy(prev);
                (Object.keys(newStates) as Strategy[]).forEach(s => {
                    Object.values(newStates[s].bettingSessions).forEach(session => {
                        if (session.history.length === 0) {
                            session.currentBalance = riskSettings.startBalance;
                            session.nextZeroBetThreshold = riskSettings.startBalance - riskSettings.zeroThreshold;
                        }
                    });
                });
                return newStates;
            });
        }
    }, [riskSettings.startBalance, riskSettings.isActive, riskSettings.zeroThreshold]);

    const handleAddEntry = useCallback((outcome: HistoryEntry) => {
        setAllStrategyStates(prevStates => {
            const newStates = deepCopy(prevStates);
            
            const processScenario = (
                session: BettingSession,
                spinHistory: HistoryEntry[],
                strategy: Strategy,
                bettingMode: BettingMode,
                dozenBettingMode: 'single' | 'double',
                useAdvancedHalves: boolean
            ) => {
                if (!riskSettings.isActive || !isBettingActive || session.history.length >= spinHistory.length + 1) {
                    return;
                }
                const analysisHistory = spinHistory.slice(0, riskSettings.analysisWindow);
                const lastAnalysis = runSingleStrategyAnalysis(analysisHistory, strategy, bettingMode, useAdvancedHalves, dozenBettingMode);
                const lastBet = calculateBet(lastAnalysis, session, riskSettings, bettingMode, dozenBettingMode);

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
                        if (bettingMode === 'docenas') {
                            const winningDozens = lastAnalysis.play.split(' y ') as Dozen[];
                            let outcomeDozen: Dozen;
                            if (outcome === 'D1') outcomeDozen = 'D1';
                            else if (outcome === 'D2H1' || outcome === 'D2H2') outcomeDozen = 'D2';
                            else outcomeDozen = 'D3';
                            
                            if (winningDozens.includes(outcomeDozen)) {
                                result = 'WIN';
                                profit = potentialProfit;
                            }
                        } else { // mitades
                                if (lastAnalysis.play === '1-18' && (outcome === 'D1' || outcome === 'D2H1')) {
                                    result = 'WIN';
                                    profit = potentialProfit;
                            } else if (lastAnalysis.play === '19-36' && (outcome === 'D3' || outcome === 'D2H2')) {
                                    result = 'WIN';
                                    profit = potentialProfit;
                            }
                        }
                    }
                    
                    const newBalance = session.currentBalance + profit;
                    const betEntry: BetHistoryEntry = {
                        round: session.currentRound,
                        suggestion: lastAnalysis.play,
                        betAmount: mainBet,
                        zeroBetAmount: zeroBet,
                        totalRisk: totalRisk,
                        outcome: outcome,
                        result: result,
                        profit: profit,
                        balance: newBalance,
                        bettingMode: bettingMode,
                        ...(bettingMode === 'docenas' && { dozenBettingMode: dozenBettingMode })
                    };
                    
                    session.history.unshift(betEntry);
                    session.currentBalance = newBalance;
                    session.totalProfit += profit;
                    session.currentRound += 1;
                    if (result === 'LOSS') {
                        session.accumulatedLoss += totalRisk;
                    } else {
                        session.accumulatedLoss = 0;
                        session.nextZeroBetThreshold = newBalance - riskSettings.zeroThreshold;
                    }
                }
            };

            (Object.keys(newStates) as Strategy[]).forEach(s => {
                const state = newStates[s];
                const isStandardHalfStrategy = s.includes('mitad');
                
                if (isStandardHalfStrategy) {
                    processScenario(state.bettingSessions.mitades_standard, state.spinHistory, s, 'mitades', 'double', false);
                } else {
                    processScenario(state.bettingSessions.docenas_single, state.spinHistory, s, 'docenas', 'single', false);
                    processScenario(state.bettingSessions.docenas_double, state.spinHistory, s, 'docenas', 'double', false);
                    processScenario(state.bettingSessions.mitades_advanced, state.spinHistory, s, 'mitades', 'double', true);
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
                    const lastOutcome = state.spinHistory.shift();

                    if (riskSettings.isActive) {
                        Object.values(state.bettingSessions).forEach(session => {
                            if (session.history.length > 0) {
                                const lastBet = session.history[0];
                                if (lastBet.outcome === lastOutcome && (session.history.length === (state.spinHistory.length ?? 0) + 1)) {
                                    session.history.shift();
                                    session.currentBalance -= lastBet.profit;
                                    session.totalProfit -= lastBet.profit;
                                    session.currentRound -= 1;
                                    
                                    // This is complex to revert accurately, simplified for now
                                    if (lastBet.result === 'LOSS') {
                                        session.accumulatedLoss -= lastBet.totalRisk;
                                    } else {
                                        session.accumulatedLoss = 0; // Simplified
                                    }
                                }
                            }
                        });
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
                Object.keys(newStates[s].bettingSessions).forEach(key => {
                    newStates[s].bettingSessions[key] = getInitialBettingSession(riskSettings.startBalance);
                });
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
                        allStrategyStates={allStrategyStates}
                        viewedStrategy={viewedStrategy}
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
