export type Dozen = 'D1' | 'D2' | 'D3';
export type Half = '1-18' | '19-36';
export type HistoryEntry = Dozen | 'Cero';
export type Strategy = 'hibrido' | 'frio' | 'caliente' | 'durmiente' | 'seguidor' | 'mitad-fria' | 'mitad-caliente';
export type BettingMode = 'docenas' | 'mitades';
export type AppView = 'dashboard' | 'statistics';

export interface Frequencies {
  counts: {
    D1: number;
    D2: number;
    D3: number;
    Cero: number;
  };
  hot: Dozen[];
  cold: Dozen[];
}

export interface AnalysisResult {
  play: string;
  reason: string;
  frequencies: Frequencies;
  isBettingOpportunity: boolean;
}

export interface RiskSettings {
    isActive: boolean;
    initialBet: number;
    minChip: number;
    isSecureGain: boolean;
    desiredGain: number;
    isCoverZero: boolean;
    zeroThreshold: number;
    zeroPayout: number;
    startBalance: number;
    oddsSingleDozen: number;
    oddsDoubleDozen: number;
    oddsHalf: number;
    useAdvancedHalvesAnalysis: boolean;
    analysisWindow: number;
    activeStrategies: Strategy[];
}

export interface BetHistoryEntry {
    round: number;
    suggestion: string;
    betAmount: number;
    zeroBetAmount: number;
    totalRisk: number;
    outcome: HistoryEntry;
    result: 'WIN' | 'LOSS';
    profit: number;
    balance: number;
    bettingMode: BettingMode; // Added to track the mode for each bet
}

export interface BettingSession {
    currentRound: number;
    accumulatedLoss: number;
    totalProfit: number;
    history: BetHistoryEntry[];
    currentBalance: number;
    nextZeroBetThreshold: number;
}

// --- NEW TYPES FOR MULTI-STRATEGY STATE ---

export interface StrategyState {
    spinHistory: HistoryEntry[];
    bettingSession: BettingSession;
}