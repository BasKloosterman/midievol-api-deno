import { Param, ScoringsFunction } from "./index.ts";
import { ScaleFamily, SCALES, ScaleName } from "./scales.ts";
import { limitMelody, pearsonCorr, rotate } from "./util.ts";

/* =========================
   Param helpers
========================= */

type EnabledScale = {
    name: ScaleName;
    notes: number[];
    profile: number[];
};

/**
 * Fixed order for param 0 -> ScaleFamily
 *
 * 0  -> major_family
 * 1  -> minor_family
 * 2  -> modal
 * 3  -> pentatonic
 * 4  -> symmetric
 * 5  -> world_color
 * 6  -> bright
 * 7  -> dark
 * 8  -> dreamy
 * 9  -> earthy
 * 10 -> mystical
 * 11 -> tense
 * 12 -> bluesy
 * 13 -> cinematic
 * 14 -> floating
 * 15 -> ritual
 * 16 -> pentatonic_structure
 * 17 -> hexatonic
 * 18 -> heptatonic
 * 19 -> octatonic
 * 20 -> open
 * 21 -> stable
 * 22 -> unstable
 * 23 -> africa_influenced
 * 24 -> asia_influenced
 * 25 -> middle_east_influenced
 * 26 -> european_folk
 * 27 -> blues_american
 * 28 -> global_folk
 */
export const SCALE_FAMILY_ORDER: ScaleFamily[] = [
    "major_family",
    "minor_family",
    "modal",
    "pentatonic",
    "symmetric",
    "world_color",

    "bright",
    "dark",
    "dreamy",
    "earthy",
    "mystical",
    "tense",
    "bluesy",
    "cinematic",
    "floating",
    "ritual",

    "pentatonic_structure",
    "hexatonic",
    "heptatonic",
    "octatonic",
    "open",
    "stable",
    "unstable",

    "africa_influenced",
    "asia_influenced",
    "middle_east_influenced",
    "european_folk",
    "blues_american",
    "global_folk",
];

/**
 * Param 0: scale family selector (not a bitmask)
 *
 * Uses SCALE_FAMILY_ORDER for stable index mapping.
 * Out-of-range values are clamped.
 */
export const mapParamToScaleFamily = (
    param: Param | undefined,
): ScaleFamily => {
    const maxIndex = SCALE_FAMILY_ORDER.length - 1;
    const value = Math.max(0, Math.min(maxIndex, Math.floor(param?.value ?? 0)));
    return SCALE_FAMILY_ORDER[value];
};

/**
 * Fixed order for bit positions inside each family.
 * Bit 0 selects first item, bit 1 second item, etc.
 */
export const FAMILY_SCALE_ORDER: Record<ScaleFamily, ScaleName[]> = {
    major_family: [
        "major",
        "mixolydian",
    ],

    minor_family: [
        "natural_minor",
        "harmonic_minor",
        "melodic_minor",
        "dorian",
    ],

    modal: [
        "dorian",
        "phrygian",
        "lydian",
        "mixolydian",
        "locrian",
    ],

    pentatonic: [
        "major_pentatonic",
        "minor_pentatonic",
        "blues",
        "egyptian_pentatonic",
        "hirajoshi",
        "insen",
    ],

    symmetric: [
        "whole_tone",
        "diminished",
    ],

    world_color: [
        "phrygian_dominant",
        "double_harmonic",
        "hungarian_minor",
    ],

    bright: [
        "major",
        "lydian",
        "major_pentatonic",
    ],

    dark: [
        "natural_minor",
        "phrygian",
        "locrian",
        "hungarian_minor",
        "hirajoshi",
    ],

    dreamy: [
        "melodic_minor",
        "lydian",
        "whole_tone",
    ],

    earthy: [
        "dorian",
        "mixolydian",
        "minor_pentatonic",
        "blues",
    ],

    mystical: [
        "harmonic_minor",
        "phrygian",
        "diminished",
        "phrygian_dominant",
        "double_harmonic",
        "hirajoshi",
    ],

    tense: [
        "harmonic_minor",
        "phrygian",
        "locrian",
        "diminished",
        "phrygian_dominant",
        "hungarian_minor",
    ],

    bluesy: [
        "minor_pentatonic",
        "blues",
    ],

    cinematic: [
        "major",
        "melodic_minor",
        "lydian",
        "whole_tone",
        "diminished",
    ],

    floating: [
        "lydian",
        "whole_tone",
        "insen",
    ],

    ritual: [
        "phrygian_dominant",
        "double_harmonic",
        "insen",
    ],

    pentatonic_structure: [
        "major_pentatonic",
        "minor_pentatonic",
        "egyptian_pentatonic",
        "hirajoshi",
        "insen",
    ],

    hexatonic: [
        "blues",
        "whole_tone",
    ],

    heptatonic: [
        "major",
        "natural_minor",
        "harmonic_minor",
        "melodic_minor",
        "dorian",
        "phrygian",
        "lydian",
        "mixolydian",
        "locrian",
        "phrygian_dominant",
        "double_harmonic",
        "hungarian_minor",
    ],

    octatonic: [
        "diminished",
    ],

    open: [
        "major_pentatonic",
        "egyptian_pentatonic",
    ],

    stable: [
        "major",
        "natural_minor",
    ],

    unstable: [
        "locrian",
        "whole_tone",
        "diminished",
    ],

    africa_influenced: [
        "major_pentatonic",
        "minor_pentatonic",
        "egyptian_pentatonic",
    ],

    asia_influenced: [
        "major_pentatonic",
        "hirajoshi",
        "insen",
    ],

    middle_east_influenced: [
        "harmonic_minor",
        "phrygian",
        "phrygian_dominant",
        "double_harmonic",
    ],

    european_folk: [
        "major",
        "natural_minor",
        "hungarian_minor",
    ],

    blues_american: [
        "mixolydian",
        "minor_pentatonic",
        "blues",
    ],

    global_folk: [
        "dorian",
        "major_pentatonic",
        "egyptian_pentatonic",
    ],
};

/**
 * Param 1: scale selector within the chosen family (bitmask)
 *
 * Bit positions are interpreted by FAMILY_SCALE_ORDER[family].
 * Invalid bits are ignored.
 * If no valid scales are selected, all scales from the family are returned.
 */
export function getEnabledScalesForFamily(
    family: ScaleFamily,
    param: Param | undefined,
): EnabledScale[] {
    const familyDefinition = SCALES[family];

    if (!familyDefinition) {
        throw new Error(`Unknown scale family "${family}".`);
    }

    const orderedNames = FAMILY_SCALE_ORDER[family];

    if (!orderedNames || orderedNames.length === 0) {
        throw new Error(`Family "${family}" has no configured scale order.`);
    }

    const availableScales: EnabledScale[] = orderedNames
        .map((name) => {
            const scale = familyDefinition.scales[name];
            if (!scale) return null;

            return {
                name,
                notes: scale.notes,
                profile: scale.profile,
            };
        })
        .filter((scale): scale is EnabledScale => scale !== null);

    if (availableScales.length === 0) {
        throw new Error(`Family "${family}" contains no scales.`);
    }

    // No param -> all scales in chosen family
    if (!param) return availableScales;

    const mask = Math.floor(param.value);

    const selected = availableScales.filter((_, index) => {
        const bit = 1 << index;
        return (mask & bit) !== 0;
    });

    return selected.length > 0 ? selected : availableScales;
}

/* =========================
   Tonality scoring
========================= */

function calculateTonalityScore(
    pitches: number[],
    enabledScales: EnabledScale[],
) {
    if (pitches.length === 0) {
        throw new Error("Note list must not be empty.");
    }

    if (enabledScales.length === 0) {
        throw new Error("No enabled scales found.");
    }

    const noteCounts = Array(12).fill(0);
    for (const pitch of pitches) {
        noteCounts[pitch % 12]++;
    }

    const totalNotes = noteCounts.reduce((a, b) => a + b, 0);
    const noteDistribution = noteCounts.map((c) => c / totalNotes);

    let bestScore = -1;
    let bestKey: [number, ScaleName] | null = null;
    let bestScaleNotes: number[] | null = null;

    for (let root = 0; root < 12; root++) {
        for (const scale of enabledScales) {
            const curScore = pearsonCorr(
                noteDistribution,
                rotate(scale.profile, 12 - root),
            );

            if (curScore > bestScore) {
                bestScore = curScore;
                bestKey = [root, scale.name];
                bestScaleNotes = scale.notes.map((interval) => (root + interval) % 12);
            }
        }
    }

    if (!bestKey || !bestScaleNotes) {
        throw new Error("No best key found");
    }

    const [root, mode] = bestKey;

    const inScaleCount = bestScaleNotes.reduce(
        (sum, pitch) => sum + noteCounts[pitch],
        0,
    );

    const inRatio = inScaleCount / totalNotes;
    const scaleSize = bestScaleNotes.length;
    const chance = scaleSize / 12;
    const finalScore = (inRatio - chance) / (1 - chance);

    const pitchNames = [
        "C", "C#", "D", "D#", "E", "F",
        "F#", "G", "G#", "A", "A#", "B",
    ];

    return {
        bestKey: `${pitchNames[root]} ${mode}`,
        tonalityScore: finalScore,
    };
}

export const scoreTonality: ScoringsFunction = (
    { melody, voiceSplits, voices, params },
) => {
    melody = limitMelody(melody, voiceSplits, voices);
    if (melody.length === 0) {
        return null;
    }

    const roundedPitches = melody.map((n) => Math.round(n.pitch / 10));

    // params[0] = family index (single choice)
    // params[1] = scale bitmask inside that family
    const family = mapParamToScaleFamily(params[0]);
    const enabledScales = getEnabledScalesForFamily(family, params[1]);

    const result = calculateTonalityScore(roundedPitches, enabledScales);

    return {
        score: result.tonalityScore,
        info: [
            { name: "key", value: result.bestKey },
            { name: "fam", value: family },
        ],
    };
};