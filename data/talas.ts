/**
 * Carnatic Suladi Sapta Tala System
 * 
 * 7 Talas × 5 Jatis = 35 possible talas
 * 
 * Angas (rhythmic units):
 * - Laghu (I): clap + finger counts, length = jati value
 * - Dhrutam (O): clap + wave = 2 beats
 * - Anudhrutam (U): single clap = 1 beat
 */

// The 5 Jatis determine the number of beats in a Laghu
export type JatiName = 'tisra' | 'chatusra' | 'khanda' | 'misra' | 'sankeerna';

export interface Jati {
    name: JatiName;
    displayName: string;
    laghuBeats: number;
}

export const JATIS: Record<JatiName, Jati> = {
    tisra: { name: 'tisra', displayName: 'Tisra', laghuBeats: 3 },
    chatusra: { name: 'chatusra', displayName: 'Chatusra', laghuBeats: 4 },
    khanda: { name: 'khanda', displayName: 'Khanda', laghuBeats: 5 },
    misra: { name: 'misra', displayName: 'Misra', laghuBeats: 7 },
    sankeerna: { name: 'sankeerna', displayName: 'Sankeerna', laghuBeats: 9 },
};

export const JATI_ORDER: JatiName[] = ['tisra', 'chatusra', 'khanda', 'misra', 'sankeerna'];

// Anga types in the tala pattern
export type AngaType = 'laghu' | 'dhrutam' | 'anudhrutam';

// Symbols used for display: I = Laghu, O = Dhrutam, U = Anudhrutam
export const ANGA_SYMBOLS: Record<AngaType, string> = {
    laghu: 'I',
    dhrutam: 'O',
    anudhrutam: 'U',
};

export const ANGA_FIXED_BEATS: Record<AngaType, number | null> = {
    laghu: null, // Variable - depends on jati
    dhrutam: 2,
    anudhrutam: 1,
};

// Chapu grouping - fixed beat counts for Chapu talas
export type ChapuGrouping = number[];  // Array of beat counts per group

// The 7 Sapta Talas + Chapu Talas
export type TalaName = 'eka' | 'rupaka' | 'jhampa' | 'triputa' | 'matya' | 'dhruva' | 'ata' | 'misra_chapu' | 'khanda_chapu';

export interface Tala {
    name: TalaName;
    displayName: string;
    pattern: AngaType[];
    description: string;
    chapuGrouping?: ChapuGrouping;  // For Chapu talas: fixed beat groupings
}

export const TALAS: Record<TalaName, Tala> = {
    eka: {
        name: 'eka',
        displayName: 'Eka',
        pattern: ['laghu'],
        description: 'Single laghu',
    },
    rupaka: {
        name: 'rupaka',
        displayName: 'Rupaka',
        pattern: ['dhrutam', 'laghu'],
        description: 'Clap-wave, then laghu',
    },
    jhampa: {
        name: 'jhampa',
        displayName: 'Jhampa',
        pattern: ['laghu', 'anudhrutam', 'dhrutam'],
        description: 'Laghu, clap, clap-wave',
    },
    triputa: {
        name: 'triputa',
        displayName: 'Triputa',
        pattern: ['laghu', 'dhrutam', 'dhrutam'],
        description: 'Laghu, two dhrutams (Chatusra Jati = Adi Tala)',
    },
    matya: {
        name: 'matya',
        displayName: 'Matya',
        pattern: ['laghu', 'dhrutam', 'laghu'],
        description: 'Laghu, dhrutam, laghu',
    },
    dhruva: {
        name: 'dhruva',
        displayName: 'Dhruva',
        pattern: ['laghu', 'dhrutam', 'laghu', 'laghu'],
        description: 'Laghu, dhrutam, two laghus',
    },
    ata: {
        name: 'ata',
        displayName: 'Ata',
        pattern: ['laghu', 'laghu', 'dhrutam', 'dhrutam'],
        description: 'Two laghus, two dhrutams',
    },
    misra_chapu: {
        name: 'misra_chapu',
        displayName: 'Misra Chapu',
        pattern: [],  // Chapu talas don't use standard angas
        description: '7 beats (3+2+2)',
        chapuGrouping: [3, 2, 2],
    },
    khanda_chapu: {
        name: 'khanda_chapu',
        displayName: 'Khanda Chapu',
        pattern: [],  // Chapu talas don't use standard angas
        description: '5 beats (2+3)',
        chapuGrouping: [2, 3],
    },
};

// Order for UI display (Sapta Talas, then Chapu Talas)
export const TALA_ORDER: TalaName[] = ['eka', 'rupaka', 'jhampa', 'triputa', 'matya', 'dhruva', 'ata'];

/**
 * Calculate total beats for a tala with a given jati.
 * For Chapu talas, jati is ignored (fixed beat count).
 */
export function calculateTotalBeats(talaName: TalaName, jatiName: JatiName): number {
    const tala = TALAS[talaName];

    // Chapu talas have fixed beat counts
    if (tala.chapuGrouping) {
        return tala.chapuGrouping.reduce((a, b) => a + b, 0);
    }

    const jati = JATIS[jatiName];
    return tala.pattern.reduce((total, anga) => {
        if (anga === 'laghu') {
            return total + jati.laghuBeats;
        }
        return total + (ANGA_FIXED_BEATS[anga] ?? 0);
    }, 0);
}

/**
 * Beat emphasis type for audio feedback
 * - 'sam': First beat of the entire tala (strongest)
 * - 'anga': First beat of each anga section (medium)
 * - 'beat': Regular beat within an anga (soft)
 */
export type BeatEmphasis = 'sam' | 'anga' | 'beat';

export interface TalaBeat {
    position: number;      // 0-indexed position in the tala
    emphasis: BeatEmphasis;
    angaIndex: number;     // Which anga this beat belongs to
    angaType: AngaType;    // Type of the anga
    beatInAnga: number;    // 0-indexed position within the anga
}

/**
 * Generate the full beat pattern for a tala with a given jati.
 * For Chapu talas, jati is ignored (fixed pattern).
 * Returns an array of beat information for audio/visual feedback.
 */
export function generateTalaPattern(talaName: TalaName, jatiName: JatiName): TalaBeat[] {
    const tala = TALAS[talaName];
    const beats: TalaBeat[] = [];
    let position = 0;

    // Handle Chapu talas with fixed groupings
    if (tala.chapuGrouping) {
        tala.chapuGrouping.forEach((groupBeats, groupIndex) => {
            for (let beatInGroup = 0; beatInGroup < groupBeats; beatInGroup++) {
                let emphasis: BeatEmphasis;

                if (position === 0) {
                    emphasis = 'sam';
                } else if (beatInGroup === 0) {
                    emphasis = 'anga';  // First beat of each group
                } else {
                    emphasis = 'beat';
                }

                beats.push({
                    position,
                    emphasis,
                    angaIndex: groupIndex,
                    angaType: 'laghu',  // Use laghu as placeholder for Chapu
                    beatInAnga: beatInGroup,
                });

                position++;
            }
        });
        return beats;
    }

    // Handle standard Sapta Talas
    const jati = JATIS[jatiName];
    tala.pattern.forEach((anga, angaIndex) => {
        const angaBeats = anga === 'laghu' ? jati.laghuBeats : (ANGA_FIXED_BEATS[anga] ?? 0);

        for (let beatInAnga = 0; beatInAnga < angaBeats; beatInAnga++) {
            let emphasis: BeatEmphasis;

            if (position === 0) {
                emphasis = 'sam';
            } else if (beatInAnga === 0) {
                emphasis = 'anga';
            } else {
                emphasis = 'beat';
            }

            beats.push({
                position,
                emphasis,
                angaIndex,
                angaType: anga,
                beatInAnga,
            });

            position++;
        }
    });

    return beats;
}

/**
 * Get the pattern notation string (e.g., "I O O" for Triputa, "3+2+2" for Misra Chapu)
 */
export function getTalaPatternNotation(talaName: TalaName): string {
    const tala = TALAS[talaName];
    // Chapu talas show their grouping
    if (tala.chapuGrouping) {
        return tala.chapuGrouping.join('+');
    }
    return tala.pattern.map(anga => ANGA_SYMBOLS[anga]).join(' ');
}

/**
 * Get a display name including the jati for well-known combinations
 */
export function getTalaDisplayName(talaName: TalaName, jatiName: JatiName): string {
    const tala = TALAS[talaName];
    // Chapu talas just use their display name
    if (tala.chapuGrouping) {
        return tala.displayName;
    }
    // Chatusra Jati Triputa Tala is commonly known as Adi Tala
    if (talaName === 'triputa' && jatiName === 'chatusra') {
        return 'Adi Tala';
    }
    // Chatusra Jati Rupaka is often just called Rupaka
    if (talaName === 'rupaka' && jatiName === 'chatusra') {
        return 'Rupaka Tala';
    }
    return `${JATIS[jatiName].displayName} ${tala.displayName}`;
}

/**
 * Parse tala string like "4-Rupaka", "6-Adi", "Adi" into tala + jati.
 * Format: "jatiValue-TalaName" or "TalaName" (defaults to chatusra).
 * jatiValue: 3=tisra, 4=chatusra, 5=khanda, 7=misra, 9=sankeerna
 */
export function parseTalaString(talaStr: string): { talaName: TalaName; jatiName: JatiName } | null {
    const normalized = talaStr.trim();
    if (!normalized) return null;

    const jatiByLaghu: Record<number, JatiName> = {
        3: 'tisra',
        4: 'chatusra',
        5: 'khanda',
        7: 'misra',
        9: 'sankeerna',
    };

    const talaByDisplay: Record<string, TalaName> = {
        eka: 'eka',
        rupaka: 'rupaka',
        jhampa: 'jhampa',
        triputa: 'triputa',
        adi: 'triputa',
        matya: 'matya',
        dhruva: 'dhruva',
        ata: 'ata',
        'misra chapu': 'misra_chapu',
        'khanda chapu': 'khanda_chapu',
    };

    const parts = normalized.split(/[\-\s]+/);
    if (parts.length >= 2) {
        const num = parseInt(parts[0], 10);
        const jatiName = jatiByLaghu[num];
        const talaPart = parts.slice(1).join(' ').toLowerCase();
        const talaName = talaByDisplay[talaPart] ?? (Object.entries(talaByDisplay).find(([k]) => talaPart.includes(k))?.[1]);
        if (jatiName && talaName) {
            return { talaName, jatiName };
        }
    }

    const single = normalized.toLowerCase();
    if (single === 'adi') return { talaName: 'triputa', jatiName: 'chatusra' };
    const talaName = talaByDisplay[single] ?? Object.entries(talaByDisplay).find(([k]) => single.includes(k))?.[1];
    if (talaName) return { talaName, jatiName: 'chatusra' };
    return null;
}

/**
 * Full formal display name, e.g. "Chatusra Jati Rupaka Tala"
 */
export function getTalaFullDisplayName(talaName: TalaName, jatiName: JatiName): string {
    const tala = TALAS[talaName];
    if (tala.chapuGrouping) return `${tala.displayName} Tala`;
    const jati = JATIS[jatiName];
    return `${jati.displayName} Jati ${tala.displayName} Tala`;
}

/**
 * Display name: common name if it exists, with full name in brackets.
 * e.g. "Rupaka Tala (Chatusra Jati Rupaka Tala)" or "Adi Tala (Chatusra Jati Triputa Tala)"
 */
export function getTalaDisplayWithFullName(talaName: TalaName, jatiName: JatiName): string {
    const common = getTalaDisplayName(talaName, jatiName);
    const full = getTalaFullDisplayName(talaName, jatiName);
    if (common === full) return common;
    return `${common} (${full})`;
}

/**
 * Cumulative beat positions where bar lines should appear (at anga boundaries).
 * For Rupaka chatusra (dhrutam 2 + laghu 4): [2, 6] — bar after 2 beats, bar after 6.
 * These repeat each cycle.
 */
export function getTalaAngaBarPositions(talaName: TalaName, jatiName: JatiName): { barAt: number[]; cycleLength: number } {
    const tala = TALAS[talaName];
    if (tala.chapuGrouping) {
        const cycleLength = tala.chapuGrouping.reduce((a, b) => a + b, 0);
        const barAt: number[] = [];
        let cum = 0;
        for (let i = 0; i < tala.chapuGrouping.length; i++) {
            cum += tala.chapuGrouping[i];
            barAt.push(cum);
        }
        return { barAt, cycleLength };
    }
    const jati = JATIS[jatiName];
    const barAt: number[] = [];
    let cum = 0;
    for (const anga of tala.pattern) {
        const beats = anga === 'laghu' ? jati.laghuBeats : (ANGA_FIXED_BEATS[anga] ?? 0);
        cum += beats;
        barAt.push(cum);
    }
    return { barAt, cycleLength: cum };
}

/**
 * Generate simple beat pattern (no tala, just equal beats)
 */
export function generateSimplePattern(beats: number): TalaBeat[] {
    return Array.from({ length: beats }, (_, i) => ({
        position: i,
        emphasis: i === 0 ? 'sam' : 'beat',
        angaIndex: 0,
        angaType: 'laghu' as AngaType,
        beatInAnga: i,
    }));
}
