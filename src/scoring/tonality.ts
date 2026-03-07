import { ScoringsFunction } from "./index.ts";
import { ChordCategory, mapParamToChordCategories, SCALE_CATEGORIES, ScaleName } from "./scales.ts";
import { limitMelody, pearsonCorr, rotate } from "./util.ts";


function getEnabledScalesFromCategories(
    categories: ChordCategory[],
): { name: ScaleName; notes: number[]; profile: number[] }[] {
    const result: { name: ScaleName; notes: number[]; profile: number[] }[] = [];

    for (const category of categories) {
        const categoryScales = SCALE_CATEGORIES[category].scales;

        for (const [name, value] of Object.entries(categoryScales)) {
            if (!value) continue;
            result.push({
                name: name as ScaleName,
                notes: value.notes,
                profile: value.profile,
            });
        }
    }

    return result;
}

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
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B",
    ];

    const bestKeyName = `${pitchNames[root]} ${mode}`;

    return {
        bestKey: bestKeyName,
        tonalityScore: finalScore,
    };
}

/* =========================
   Exported scorer
========================= */

export const scoreTonality: ScoringsFunction = (
    { melody, voiceSplits, voices, params },
) => {
    melody = limitMelody(melody, voiceSplits, voices);
    if (melody.length === 0) {
        return null;
    }

    const roundedPitches = melody.map((n) => Math.round(n.pitch / 10));

    const categories = mapParamToChordCategories(params[0]);
    const enabledScales = getEnabledScalesFromCategories(categories);

    const result = calculateTonalityScore(roundedPitches, enabledScales);

    return {
        score: result.tonalityScore,
        info: [{ name: "key", value: result.bestKey }],
    };
};