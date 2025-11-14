import React from 'react';
import { Strategy, BettingMode, RiskSettings } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    bettingMode: BettingMode;
    onSetBettingMode: (mode: BettingMode) => void;
    riskSettings: RiskSettings;
    onSetRiskSettings: React.Dispatch<React.SetStateAction<RiskSettings>>;
    onResetSession: () => void;
}

interface StrategyInfo {
    value: Strategy;
    label: string;
    group: 'principal' | 'adicional' | 'mitades';
    meaning: string;
    howItWorks: string;
}

const strategyOptions: StrategyInfo[] = [
    { 
        value: 'hibrido', 
        label: 'Híbrido', 
        group: 'principal',
        meaning: 'Una estrategia flexible que combina la búsqueda de corrección (apostar a lo frío) con la confirmación de tendencias recientes.',
        howItWorks: 'Prioriza apostar a las dos docenas que NO son la más "fría". Es un equilibrio entre esperar el balance estadístico y seguir una señal inmediata.'
    },
    { 
        value: 'frio', 
        label: 'Corrección', 
        group: 'principal',
        meaning: 'Basada en la "Ley del Tercio", esta estrategia apuesta a que las probabilidades se equilibrarán a largo plazo.',
        howItWorks: 'Identifica la docena que ha aparecido con menos frecuencia (la "fría") y sugiere apostar en las OTRAS DOS, esperando que la fría no salga.'
    },
    { 
        value: 'caliente', 
        label: 'Tendencia', 
        group: 'principal',
        meaning: 'Una estrategia que busca capitalizar rachas o "tendencias" a corto plazo, apostando contra lo que ya está saliendo.',
        howItWorks: 'Identifica la docena que ha salido con más frecuencia (la "caliente") y sugiere apostar en las OTRAS DOS. La idea es apostar a que la racha se va a romper.'
    },
    { 
        value: 'durmiente', 
        label: 'Durmiente', 
        group: 'adicional',
        meaning: 'Una variante de la estrategia de corrección que espera una señal más fuerte antes de actuar, enfocándose en una ausencia prolongada.',
        howItWorks: 'El sistema espera a que una docena no aparezca durante un número predefinido de giros (ej. 7). A esa docena se le llama "durmiente" y se apuesta a las OTRAS DOS.'
    },
    { 
        value: 'seguidor', 
        label: 'Seguidor', 
        group: 'adicional',
        meaning: 'La estrategia más simple y reactiva, que va en contra de la inercia del último resultado.',
        howItWorks: 'No analiza un historial largo. Simplemente sugiere apostar a las dos docenas que NO salieron en el último giro. Se basa en la idea de que los números no se repiten tan seguido.'
    },
    {
        value: 'mitad-fria',
        label: 'Corrección de Mitad',
        group: 'mitades',
        meaning: 'Aplica la lógica de corrección al juego de mitades (1-18 vs 19-36).',
        howItWorks: 'Analiza la frecuencia de D1 (representa 1-18) y D3 (representa 19-36). Sugiere apostar a la mitad que ha salido MENOS veces, buscando el equilibrio.'
    },
    {
        value: 'mitad-caliente',
        label: 'Tendencia de Mitad',
        group: 'mitades',
        meaning: 'Busca y sigue la tendencia o racha actual en el juego de mitades.',
        howItWorks: 'Analiza la frecuencia de D1 (representa 1-18) y D3 (representa 19-36). Sugiere apostar a la mitad que ha salido MÁS veces, para seguir la racha.'
    }
];

const bettingModeOptions: { value: BettingMode; label: string }[] = [ { value: 'docenas', label: 'Docenas' }, { value: 'mitades', label: 'Mitades' } ];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, bettingMode, onSetBettingMode, riskSettings, onSetRiskSettings, onResetSession }) => {

    if (!isOpen) return null;

    const handleStrategyChange = (strategy: Strategy, checked: boolean) => {
        onSetRiskSettings(prev => {
            const currentStrategies = prev.activeStrategies || [];
            let newStrategies;
            if (checked) {
                newStrategies = [...new Set([...currentStrategies, strategy])];
            } else {
                newStrategies = currentStrategies.filter(s => s !== strategy);
            }
            return { ...prev, activeStrategies: newStrategies };
        });
    };

    const handleRiskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        
        if (name === 'useAdvancedHalvesAnalysis') {
            onSetRiskSettings(prev => {
                const newSettings = { ...prev, useAdvancedHalvesAnalysis: checked };
                if (!checked && bettingMode === 'mitades') {
                    const newActive = (newSettings.activeStrategies || []).filter(s => s.includes('mitad'));
                    if (newActive.length === 0) newActive.push('mitad-fria');
                    newSettings.activeStrategies = newActive;
                }
                return newSettings;
            });
            return;
        }

        onSetRiskSettings(prev => {
            if (type === 'checkbox') {
                return { ...prev, [name]: checked };
            }
            const numericValue = parseFloat(value);
            return {
                ...prev,
                [name]: isNaN(numericValue) ? 0 : numericValue
            };
        });
    };
    
    const strategyGroups = {
        principal: strategyOptions.filter(opt => opt.group === 'principal'),
        adicional: strategyOptions.filter(opt => opt.group === 'adicional'),
        mitades: strategyOptions.filter(opt => opt.group === 'mitades'),
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-[#2a313b] border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                    <h2 className="text-2xl font-bold text-white">Configuración y Estrategias</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors duration-200" aria-label="Cerrar configuración">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="space-y-6">
                     <div>
                        <h3 className="text-xl font-bold text-white mb-3">Modo de Apuesta</h3>
                        <div className="grid grid-cols-2 gap-2">{bettingModeOptions.map(({ value, label }) => (<div key={value}><input type="radio" id={`mode-modal-${value}`} name="bettingMode-modal" value={value} checked={bettingMode === value} onChange={() => onSetBettingMode(value)} className="hidden peer" /><label htmlFor={`mode-modal-${value}`} className="block w-full text-center py-2.5 px-4 rounded-lg cursor-pointer transition-all duration-200 bg-[#3b4452]/70 border-2 border-transparent peer-hover:border-gray-400/50 peer-checked:bg-[#6366f1] peer-checked:text-white peer-checked:font-bold peer-checked:border-[#6366f1] peer-checked:shadow-[0_0_10px_rgba(99,102,241,0.5)]">{label}</label></div>))}</div>
                    </div>
                    
                    {bettingMode === 'mitades' && (
                        <div className="pt-4 border-t border-white/10 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <h4 className="text-md font-semibold text-gray-200">Análisis Avanzado de Mitades</h4>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" name="useAdvancedHalvesAnalysis" checked={riskSettings.useAdvancedHalvesAnalysis} onChange={handleRiskChange} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                Permite usar las estrategias de docenas (Corrección, Tendencia, etc.) para analizar y apostar en mitades.
                            </p>
                        </div>
                    )}

                    <div>
                        <h3 className="text-xl font-bold text-white mb-3">Estrategias Activas</h3>
                        <p className="text-xs text-gray-400 mb-3">
                            {bettingMode === 'docenas' 
                                ? "Seleccione una o más estrategias para análisis de docenas." 
                                : riskSettings.useAdvancedHalvesAnalysis 
                                    ? "Las estrategias de docenas se adaptarán para analizar mitades."
                                    : "Seleccione una o más estrategias específicas para mitades."}
                        </p>
                        <div className="animate-fade-in space-y-3">
                            <div style={{ display: (bettingMode === 'docenas' || riskSettings.useAdvancedHalvesAnalysis) ? 'block' : 'none' }}>
                                <h4 className="text-md font-semibold text-gray-300 mb-2">Principales</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {strategyGroups.principal.map(({ value, label }) => (<div key={value}><input type="checkbox" id={`strat-modal-${value}`} name="strategy-modal" value={value} checked={riskSettings.activeStrategies.includes(value)} onChange={(e) => handleStrategyChange(value, e.target.checked)} className="hidden peer" /><label htmlFor={`strat-modal-${value}`} className="block w-full text-center py-2.5 px-2 rounded-lg cursor-pointer transition-all duration-200 bg-[#3b4452]/70 border-2 border-transparent text-sm peer-hover:border-gray-400/50 peer-checked:bg-[#f0b90b] peer-checked:text-[#1a1a1a] peer-checked:font-bold peer-checked:border-[#f0b90b] peer-checked:shadow-[0_0_10px_rgba(240,185,11,0.5)]">{label}</label></div>))}
                                </div>
                                <h4 className="text-md font-semibold text-gray-300 mt-3 mb-2">Adicionales</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {strategyGroups.adicional.map(({ value, label }) => (<div key={value}><input type="checkbox" id={`strat-modal-${value}`} name="strategy-modal" value={value} checked={riskSettings.activeStrategies.includes(value)} onChange={(e) => handleStrategyChange(value, e.target.checked)} className="hidden peer" /><label htmlFor={`strat-modal-${value}`} className="block w-full text-center py-2.5 px-2 rounded-lg cursor-pointer transition-all duration-200 bg-[#3b4452]/70 border-2 border-transparent text-sm peer-hover:border-gray-400/50 peer-checked:bg-[#f0b90b] peer-checked:text-[#1a1a1a] peer-checked:font-bold peer-checked:border-[#f0b90b] peer-checked:shadow-[0_0_10px_rgba(240,185,11,0.5)]">{label}</label></div>))}
                                </div>
                            </div>
                            
                            <div style={{ display: (bettingMode === 'mitades' && !riskSettings.useAdvancedHalvesAnalysis) ? 'block' : 'none' }}>
                                <h4 className="text-md font-semibold text-gray-300 mb-2">Estrategias de Mitades</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {strategyGroups.mitades.map(({ value, label }) => (<div key={value}><input type="checkbox" id={`strat-modal-${value}`} name="strategy-modal" value={value} checked={riskSettings.activeStrategies.includes(value)} onChange={(e) => handleStrategyChange(value, e.target.checked)} className="hidden peer" /><label htmlFor={`strat-modal-${value}`} className="block w-full text-center py-2.5 px-2 rounded-lg cursor-pointer transition-all duration-200 bg-[#3b4452]/70 border-2 border-transparent text-sm peer-hover:border-gray-400/50 peer-checked:bg-[#f0b90b] peer-checked:text-[#1a1a1a] peer-checked:font-bold peer-checked:border-[#f0b90b] peer-checked:shadow-[0_0_10px_rgba(240,185,11,0.5)]">{label}</label></div>))}
                                </div>
                            </div>
                        </div>
                    </div>

                     <div className="pt-6 border-t border-white/10">
                        <h3 className="text-xl font-bold text-white mb-3">Configuración de Análisis</h3>
                        <div>
                             <label className="block text-sm font-medium text-gray-300">Ventana de Análisis (giros)</label>
                             <input 
                                type="number" 
                                name="analysisWindow" 
                                value={riskSettings.analysisWindow} 
                                onChange={handleRiskChange} 
                                className="mt-1 block w-full bg-[#3b4452] border-transparent rounded-md py-2 px-3 text-white" 
                                placeholder="Ej. 60"
                             />
                             <p className="text-xs text-gray-400 mt-1">Número de giros recientes a considerar para las sugerencias.</p>
                        </div>
                    </div>
                
                    <div className="pt-6 border-t border-white/10">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xl font-bold text-white">Gestión de Riesgo</h3>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" name="isActive" checked={riskSettings.isActive} onChange={handleRiskChange} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>
                        {riskSettings.isActive && (
                            <div className="space-y-4 p-4 bg-[#1a1f25] rounded-lg animate-fade-in">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-300">Balance Inicial</label><input type="number" name="startBalance" value={riskSettings.startBalance} onChange={handleRiskChange} className="mt-1 block w-full bg-[#3b4452] border-transparent rounded-md py-2 px-3 text-white" /></div>
                                    <div><label className="block text-sm font-medium text-gray-300">Apuesta Inicial</label><input type="number" name="initialBet" value={riskSettings.initialBet} onChange={handleRiskChange} className="mt-1 block w-full bg-[#3b4452] border-transparent rounded-md py-2 px-3 text-white" /></div>
                                    <div><label className="block text-sm font-medium text-gray-300">Ficha Mínima</label><input type="number" name="minChip" step="0.01" value={riskSettings.minChip} onChange={handleRiskChange} className="mt-1 block w-full bg-[#3b4452] border-transparent rounded-md py-2 px-3 text-white" /></div>
                                </div>
                                
                                <div className="pt-4 border-t border-white/10">
                                    <h4 className="text-md font-semibold text-gray-200 mb-3">Configuración de Cuotas</h4>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-300">Cuota Docena Única</label><input type="number" name="oddsSingleDozen" step="0.1" value={riskSettings.oddsSingleDozen} onChange={handleRiskChange} className="mt-1 block w-full bg-[#3b4452] border-transparent rounded-md py-2 px-3 text-white" /></div>
                                        <div><label className="block text-sm font-medium text-gray-300">Cuota Doble Docena</label><input type="number" name="oddsDoubleDozen" step="0.1" value={riskSettings.oddsDoubleDozen} onChange={handleRiskChange} className="mt-1 block w-full bg-[#3b4452] border-transparent rounded-md py-2 px-3 text-white" /></div>
                                        <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-300">Cuota Mitades (1-18/19-36)</label><input type="number" name="oddsHalf" step="0.1" value={riskSettings.oddsHalf} onChange={handleRiskChange} className="mt-1 block w-full bg-[#3b4452] border-transparent rounded-md py-2 px-3 text-white" /></div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/10 space-y-4">
                                    <div className="flex items-center"><input type="checkbox" id="isSecureGain" name="isSecureGain" checked={riskSettings.isSecureGain} onChange={handleRiskChange} className="h-4 w-4 rounded text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-600" /><label htmlFor="isSecureGain" className="ml-2 block text-sm text-gray-300">Modo Ganancia Segura</label></div>
                                    {riskSettings.isSecureGain && <div><label className="block text-sm font-medium text-gray-300">Ganancia Deseada</label><input type="number" name="desiredGain" value={riskSettings.desiredGain} onChange={handleRiskChange} className="mt-1 block w-full bg-[#3b4452] border-transparent rounded-md py-2 px-3 text-white" /></div>}

                                    <div className="flex items-center"><input type="checkbox" id="isCoverZero" name="isCoverZero" checked={riskSettings.isCoverZero} onChange={handleRiskChange} className="h-4 w-4 rounded text-emerald-500 bg-gray-700 border-gray-600 focus:ring-emerald-600" /><label htmlFor="isCoverZero" className="ml-2 block text-sm text-gray-300">Cubrir el Cero</label></div>
                                    {riskSettings.isCoverZero && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-300">Cubrir cada (riesgo)</label><input type="number" name="zeroThreshold" value={riskSettings.zeroThreshold} onChange={handleRiskChange} className="mt-1 block w-full bg-[#3b4452] border-transparent rounded-md py-2 px-3 text-white" /></div>
                                        <div><label className="block text-sm font-medium text-gray-300">Pago del Cero (1 a X)</label><input type="number" name="zeroPayout" value={riskSettings.zeroPayout} onChange={handleRiskChange} className="mt-1 block w-full bg-[#3b4452] border-transparent rounded-md py-2 px-3 text-white" /></div>
                                    </div>}
                                </div>
                                <div className="pt-4 border-t border-white/10">
                                    <button onClick={onResetSession} className="w-full py-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors">Reiniciar Sesión y Balance</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;