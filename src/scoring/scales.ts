/* =========================
   Category param mapping
========================= */

import { Param } from "./index.ts";

export type ScaleName =
    | "major"
    | "minor"
    | "diminished"
    | "whole_tone"
    | "lydian"
    | "major_pentatonic"
    | "harmonic_minor";

export type ChordCategory = "tonal_core" | "open_modal" | "exotic";

const categoryFlagMap: Record<number, ChordCategory> = {
    [1 << 0]: "tonal_core",
    [1 << 1]: "open_modal",
    [1 << 2]: "exotic",
};

export const mapParamToChordCategories = (
    param: Param | undefined,
): ChordCategory[] => {
    if (!param) return ["tonal_core"];

    const mask = Math.floor(param.value);
    const enabled: ChordCategory[] = [];

    for (const bit in categoryFlagMap) {
        const bitNum = Number(bit);
        if ((mask & bitNum) !== 0) {
            enabled.push(categoryFlagMap[bitNum]);
        }
    }

    return enabled.length > 0 ? enabled : ["tonal_core"];
};

/* =========================
   Profiles
========================= */

const MAJOR_PROFILE = [
    6.33, 2.2, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];

const MINOR_PROFILE = [
    6.33, 2.88, 3.48, 4.09, 2.52, 3.66, 2.29, 4.38, 2.2, 5.19, 2.33, 2.39,
];

const DIMINISHED_PROFILE = [
    6.0, 0.5, 4.5, 4.0, 0.5, 4.5, 4.0, 0.5, 4.5, 3.5, 0.5, 4.0,
];

const HARMONIC_MINOR_PROFILE = [
    6.2, 2.2, 3.8, 4.6, 2.4, 4.2, 2.3, 5.0, 4.0, 2.1, 2.0, 4.8
]

const LYDIAN_PROFILE = [
    6.35, 2.23, 3.48, 2.33, 4.38, 2.52, 4.09, 5.19, 2.39, 3.66, 2.29, 2.88,
];

const WHOLE_TONE_PROFILE = [
    4.5, 0.5, 4.0, 0.5, 4.0, 0.5, 4.0, 0.5, 4.0, 0.5, 4.0, 0.5,
];

const MAJOR_PENTATONIC_PROFILE = [
    6.0, 0.5, 4.0, 0.5, 4.5, 0.5, 0.5, 4.8, 0.5, 4.0, 0.5, 0.5,
];

/* =========================
   Scales
========================= */

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

const DIMINISHED_SCALE = [0, 2, 3, 5, 6, 8, 9, 11];
const WHOLE_TONE_SCALE = [0, 2, 4, 6, 8, 10];
const HARMONIC_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 11]

const LYDIAN_SCALE = [0, 2, 4, 6, 7, 9, 11];
const MAJOR_PENTATONIC_SCALE = [0, 2, 4, 7, 9];

/* =========================
   Scale categories
========================= */

export const SCALE_CATEGORIES: Record<
    ChordCategory,
    {
        description: string;
        scales: Partial<Record<ScaleName, { notes: number[]; profile: number[] }>>;
    }
> = {
    tonal_core: {
        description:
            "Herkenbare tonale akkoorden uit pop, rock en folk (majeur, mineur).",
        scales: {
            major: {
                notes: MAJOR_SCALE,
                profile: MAJOR_PROFILE,
            },
            minor: {
                notes: MINOR_SCALE,
                profile: MINOR_PROFILE,
            },
        },
    },

    open_modal: {
        description:
            "Open en modale harmonie zonder sterke functionele richting.",
        scales: {
            lydian: {
                notes: LYDIAN_SCALE,
                profile: LYDIAN_PROFILE,
            },
            major_pentatonic: {
                notes: MAJOR_PENTATONIC_SCALE,
                profile: MAJOR_PENTATONIC_PROFILE,
            },
        },
    },

    exotic: {
        description: "Rijke vierklanken scales.",
        scales: {
            diminished: {
                notes: DIMINISHED_SCALE,
                profile: DIMINISHED_PROFILE,
            },
            whole_tone: {
                notes: WHOLE_TONE_SCALE,
                profile: WHOLE_TONE_PROFILE,
            },
            harmonic_minor: {
                notes: HARMONIC_MINOR_SCALE,
                profile: HARMONIC_MINOR_PROFILE,
            },
        },
    },
};