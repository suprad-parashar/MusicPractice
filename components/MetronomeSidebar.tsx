'use client';

import { useState, useEffect, useRef } from 'react';
import * as metronome from '@/lib/metronome';
import {
    TALAS,
    JATIS,
    TALA_ORDER,
    JATI_ORDER,
    calculateTotalBeats,
    generateTalaPattern,
    generateSimplePattern,
    getTalaPatternNotation,
    getTalaDisplayName,
    type TalaName,
    type JatiName,
} from '@/data/talas';

export type MetronomeMode = 'simple' | 'tala';

interface MetronomeSidebarProps {
    mode: MetronomeMode;
    onModeChange: (mode: MetronomeMode) => void;
    simpleBeats: number;
    onSimpleBeatsChange: (beats: number) => void;
    tala: TalaName;
    onTalaChange: (tala: TalaName) => void;
    jati: JatiName;
    onJatiChange: (jati: JatiName) => void;
    tempo: number;
    onTempoChange: (tempo: number) => void;
    volume: number;
    onVolumeChange: (volume: number) => void;
}

const TEMPO_MIN = 30;
const TEMPO_MAX = 300;
const TEMPO_STEP = 5;

/**
 * Renders a control sidebar for the metronome with support for simple beats and Carnatic talas.
 */
export default function MetronomeSidebar({
    mode,
    onModeChange,
    simpleBeats,
    onSimpleBeatsChange,
    tala,
    onTalaChange,
    jati,
    onJatiChange,
    tempo,
    onTempoChange,
    volume,
    onVolumeChange,
}: MetronomeSidebarProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentBeat, setCurrentBeat] = useState(-1);
    const [tempoInputValue, setTempoInputValue] = useState(String(tempo));
    const isPlayingRef = useRef(false);

    // Calculate current pattern based on mode
    const totalBeats = mode === 'simple' ? simpleBeats : calculateTotalBeats(tala, jati);
    const pattern = mode === 'simple'
        ? generateSimplePattern(simpleBeats)
        : generateTalaPattern(tala, jati);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            metronome.disposeMetronome();
            isPlayingRef.current = false;
        };
    }, []);

    // Update volume when it changes
    useEffect(() => {
        metronome.setMetronomeVolume(volume);
    }, [volume]);

    // Update tempo when it changes
    useEffect(() => {
        metronome.setMetronomeTempo(tempo);
        setTempoInputValue(String(tempo));
    }, [tempo]);

    // Update pattern when mode/tala/jati/beats change while playing
    useEffect(() => {
        if (isPlayingRef.current) {
            metronome.setMetronomePattern(pattern);
        }
    }, [mode, tala, jati, simpleBeats]);

    const startMetronome = async () => {
        if (isPlayingRef.current) return;
        try {
            await metronome.startMetronome(pattern, tempo, (beatIndex) => {
                setCurrentBeat(beatIndex);
            });
            isPlayingRef.current = true;
            setIsPlaying(true);
        } catch (error) {
            console.error('Error starting metronome:', error);
            isPlayingRef.current = false;
            setIsPlaying(false);
        }
    };

    const stopMetronome = () => {
        metronome.stopMetronome();
        isPlayingRef.current = false;
        setIsPlaying(false);
        setCurrentBeat(-1);
    };

    const toggleMetronome = () => {
        if (isPlaying) {
            stopMetronome();
        } else {
            startMetronome();
        }
    };

    const handleTempoChange = (newTempo: number) => {
        // Round to nearest step of 5
        const rounded = Math.round(newTempo / TEMPO_STEP) * TEMPO_STEP;
        const clamped = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, rounded));
        onTempoChange(clamped);
    };

    const incrementTempo = () => handleTempoChange(tempo + TEMPO_STEP);
    const decrementTempo = () => handleTempoChange(tempo - TEMPO_STEP);

    return (
        <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-700/50">
            <div className="text-center mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-light mb-1 tracking-wide">Metronome</h2>
                <p className="text-slate-400 text-xs">Rhythm Practice</p>
            </div>

            {/* Mode Toggle */}
            <div className="mb-3 sm:mb-4">
                <label className="block text-xs font-medium text-slate-300 mb-2 text-center">Mode</label>
                <div className="flex border border-slate-600 rounded-lg overflow-hidden bg-slate-800/30">
                    <button
                        onClick={() => onModeChange('simple')}
                        className={`
              flex-1 py-1.5 sm:py-2 px-2 text-[10px] sm:text-xs font-medium transition-all duration-200
              border-r border-slate-600
              focus:outline-none focus:ring-0
              ${mode === 'simple'
                                ? 'bg-amber-500 text-slate-900'
                                : 'bg-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                            }
            `}
                    >
                        Simple
                    </button>
                    <button
                        onClick={() => onModeChange('tala')}
                        className={`
              flex-1 py-1.5 sm:py-2 px-2 text-[10px] sm:text-xs font-medium transition-all duration-200
              focus:outline-none focus:ring-0
              ${mode === 'tala'
                                ? 'bg-amber-500 text-slate-900'
                                : 'bg-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                            }
            `}
                    >
                        Tala
                    </button>
                </div>
            </div>

            {/* Simple Mode: Beats Selection */}
            {mode === 'simple' && (
                <div className="mb-3 sm:mb-4">
                    <label className="block text-xs font-medium text-slate-300 mb-2 text-center">
                        Beats per cycle
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((beats) => (
                            <button
                                key={beats}
                                onClick={() => onSimpleBeatsChange(beats)}
                                className={`
                  py-1.5 px-2 text-xs font-medium rounded transition-all duration-200
                  ${simpleBeats === beats
                                        ? 'bg-amber-500 text-slate-900'
                                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                    }
                `}
                            >
                                {beats}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Tala Mode: Tala and Jati Selection */}
            {mode === 'tala' && (
                <>
                    <div className="mb-3 sm:mb-4">
                        <label className="block text-xs font-medium text-slate-300 mb-2 text-center">
                            Tala
                        </label>
                        <select
                            value={tala}
                            onChange={(e) => onTalaChange(e.target.value as TalaName)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                            {TALA_ORDER.map((t) => (
                                <option key={t} value={t}>
                                    {TALAS[t].displayName} ({getTalaPatternNotation(t)})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Jati selector - hidden for Chapu talas (fixed beat count) */}
                    {!TALAS[tala].chapuGrouping && (
                        <div className="mb-3 sm:mb-4">
                            <label className="block text-xs font-medium text-slate-300 mb-2 text-center">
                                Jati (Laghu count)
                            </label>
                            <div className="flex border border-slate-600 rounded-lg overflow-hidden bg-slate-800/30">
                                {JATI_ORDER.map((j, idx) => (
                                    <button
                                        key={j}
                                        onClick={() => onJatiChange(j)}
                                        className={`
                                            flex-1 py-1.5 px-1 text-[10px] sm:text-xs font-medium transition-all duration-200
                                            ${idx < JATI_ORDER.length - 1 ? 'border-r border-slate-600' : ''}
                                            focus:outline-none focus:ring-0
                                            ${jati === j
                                                ? 'bg-amber-500 text-slate-900'
                                                : 'bg-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                                            }
                                        `}
                                        title={JATIS[j].displayName}
                                    >
                                        {JATIS[j].laghuBeats}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tala Info */}
                    <div className="mb-3 sm:mb-4 bg-slate-800/50 rounded-lg p-2 text-center">
                        <p className="text-xs text-amber-400 font-medium">
                            {getTalaDisplayName(tala, jati)}
                        </p>
                        <p className="text-xs text-slate-400">
                            {totalBeats} beats • {getTalaPatternNotation(tala)}
                        </p>
                    </div>
                </>
            )}

            {/* Play/Stop Button */}
            <div className="flex flex-col items-center mb-3 sm:mb-4">
                <button
                    onClick={toggleMetronome}
                    className={`
            relative w-16 h-16 sm:w-20 sm:h-20 rounded-full
            border-2 border-[var(--border)]
            transition-all duration-300 ease-out
            ${isPlaying
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/50 scale-105 border-[var(--accent)]'
                            : 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700'
                        }
            flex items-center justify-center
          `}
                >
                    <svg
                        className="w-6 h-6 sm:w-8 sm:h-8 transition-transform duration-300"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        {isPlaying ? (
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        ) : (
                            <path d="M8 5v14l11-7z" />
                        )}
                    </svg>
                </button>
                <p className="mt-2 text-slate-400 text-xs">
                    {isPlaying ? 'Playing' : 'Stopped'}
                </p>
            </div>

            {/* Beat Indicator */}
            {isPlaying && (
                <div className="mb-3 sm:mb-4">
                    <div className="flex justify-center flex-wrap gap-1">
                        {pattern.map((beat, idx) => (
                            <div
                                key={idx}
                                className={`
                  w-3 h-3 rounded-full transition-all duration-100
                  ${currentBeat === idx
                                        ? beat.emphasis === 'sam'
                                            ? 'bg-amber-400 scale-125 shadow-lg shadow-amber-400/50'
                                            : beat.emphasis === 'anga'
                                                ? 'bg-amber-500 scale-110'
                                                : 'bg-amber-600'
                                        : 'bg-slate-600'
                                    }
                `}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Tempo Control */}
            <div className="mb-3 sm:mb-4">
                <div className="flex flex-row items-center justify-center gap-2">
                    <label className="text-xs font-medium text-slate-300 shrink-0">Tempo</label>
                    <div className="flex flex-row items-stretch rounded-lg border border-slate-600 bg-slate-800/50 overflow-hidden shrink-0">
                        <button
                            type="button"
                            onClick={decrementTempo}
                            disabled={tempo <= TEMPO_MIN}
                            aria-label="Decrease tempo"
                            className="h-8 w-8 shrink-0 flex items-center justify-center text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-800/80 disabled:text-slate-500 transition-colors border-r border-slate-600"
                        >
                            −
                        </button>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={tempoInputValue}
                            onFocus={() => setTempoInputValue(String(tempo))}
                            onChange={(e) => {
                                // Allow only digits, let user type freely
                                const val = e.target.value.replace(/\D/g, '');
                                setTempoInputValue(val);
                            }}
                            onBlur={() => {
                                let num = parseInt(tempoInputValue, 10);
                                if (isNaN(num) || num < TEMPO_MIN) num = TEMPO_MIN;
                                if (num > TEMPO_MAX) num = TEMPO_MAX;
                                num = Math.round(num / TEMPO_STEP) * TEMPO_STEP;
                                onTempoChange(num);
                                setTempoInputValue(String(num));
                            }}
                            className="w-10 flex items-center justify-center text-center text-sm font-semibold text-slate-900 bg-amber-500 border-r border-slate-600 outline-none"
                            aria-label="Tempo BPM"
                        />
                        <button
                            type="button"
                            onClick={incrementTempo}
                            disabled={tempo >= TEMPO_MAX}
                            aria-label="Increase tempo"
                            className="h-8 w-8 shrink-0 flex items-center justify-center text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-800/80 disabled:text-slate-500 transition-colors"
                        >
                            +
                        </button>
                    </div>
                    <span className="text-xs text-slate-400">BPM</span>
                </div>
            </div>

            {/* Volume Control */}
            <div>
                <label className="block text-xs font-medium text-slate-300 mb-2 text-center">
                    Volume
                </label>
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={volume}
                        onInput={(e) => onVolumeChange(parseFloat((e.target as HTMLInputElement).value))}
                        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="text-slate-400 text-xs w-8 text-right">
                        {Math.round(volume * 100)}%
                    </span>
                </div>
            </div>
        </div>
    );
}
