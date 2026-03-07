import { Param, ScoringsFunction } from "./index.ts";
import { ScaleCategory, SCALE_CATEGORIES, ScaleName } from "./scales.ts";
import { limitMelody, pearsonCorr, rotate } from "./util.ts";


/* =========================
   Param helpers
========================= */

/**
 * Param 0: category selector (not a bitmask)
 * 0 -> tonal_core
 * 1 -> open_modal
 * 2 -> exotic
 */
export const mapParamToScaleCategory = (
    param: Param | undefined,
): ScaleCategory => {
    const value = Math.floor(param?.value ?? 0);

    switch (value) {
        case 1:
            return "open_modal";
        case 2:
            return "exotic";
        case 0:
        default:
            return "tonal_core";
    }
};

/**
 * Param 1: scale selector within the chosen category (bitmask)
 *
 * Bit positions are interpreted by the order of scales inside the chosen category.
 * Invalid bits are ignored.
 * If no valid scales are selected, all scales from the category are returned.
 */
function getEnabledScalesForCategory(
    category: ScaleCategory,
    param: Param | undefined,
): { name: ScaleName; notes: number[]; profile: number[] }[] {
    const categoryScales = SCALE_CATEGORIES[category].scales;

    const availableScales = Object.entries(categoryScales)
        .filter((entry): entry is [ScaleName, { notes: number[]; profile: number[] }] => {
            return !!entry[1];
        })
        .map(([name, value]) => ({
            name,
            notes: value.notes,
            profile: value.profile,
        }));

    if (availableScales.length === 0) {
        throw new Error(`Category "${category}" contains no scales.`);
    }

    // No param -> all scales in chosen category
    if (!param) return availableScales;

    const mask = Math.floor(param.value);

    const selected = availableScales.filter((_, index) => {
        const bit = 1 << index;
        return (mask & bit) !== 0;
    });

    // Invalid bits are automatically ignored because we only test against
    // indices that actually exist in this category.
    // If no valid bits matched, fall back to all scales.
    return selected.length > 0 ? selected : availableScales;
}

/* =========================
   Tonality scoring
========================= */



function calculateTonalityScore(
    pitches: number[],
    enabledScales: { name: ScaleName; notes: number[]; profile: number[] }[],
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

    // params[0] = category index (single choice)
    // params[1] = scale bitmask inside that category
    const category = mapParamToScaleCategory(params[0]);
    const enabledScales = getEnabledScalesForCategory(category, params[1]);

    const result = calculateTonalityScore(roundedPitches, enabledScales);

    return {
        score: result.tonalityScore,
        info: [
            { name: "category", value: category },
            { name: "key", value: result.bestKey },
        ],
    };
};