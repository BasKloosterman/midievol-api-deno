/* =========================
   Types
========================= */

export type ScaleName =
    | "major"
    | "minor"
    | "harmonic_minor"
    | "diminished"
    | "whole_tone"
    | "lydian"
    | "major_pentatonic";

export type ScaleCategory = "tonal_core" | "open_modal" | "exotic";

/* =========================
   Profiles
========================= */

const MAJOR_PROFILE = [
    6.33, 2.2, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];

const MINOR_PROFILE = [
    6.33, 2.88, 3.48, 4.09, 2.52, 3.66, 2.29, 4.38, 2.2, 5.19, 2.33, 2.39,
];

const HARMONIC_MINOR_PROFILE = [
    6.2, // 1
    0.5, // b2 (out)
    3.8, // 2
    4.6, // b3
    0.5, // 3 (out)
    4.2, // 4
    0.5, // b5 (out)
    5.0, // 5
    4.0, // b6
    0.5, // 6 (out)
    0.5, // b7 (out)
    4.8, // 7
];

const DIMINISHED_PROFILE = [
    6.0, 0.5, 4.5, 4.0, 0.5, 4.5, 4.0, 0.5, 4.5, 3.5, 0.5, 4.0,
];

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
const HARMONIC_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 11];
const DIMINISHED_SCALE = [0, 2, 3, 5, 6, 8, 9, 11];
const WHOLE_TONE_SCALE = [0, 2, 4, 6, 8, 10];
const LYDIAN_SCALE = [0, 2, 4, 6, 7, 9, 11];
const MAJOR_PENTATONIC_SCALE = [0, 2, 4, 7, 9];

/* =========================
   Category definitions
========================= */

export const SCALE_CATEGORIES: Record<
    ScaleCategory,
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
            harmonic_minor: {
                notes: HARMONIC_MINOR_SCALE,
                profile: HARMONIC_MINOR_PROFILE,
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
        description: "Meer symmetrische / kleur-gedreven scales.",
        scales: {
            diminished: {
                notes: DIMINISHED_SCALE,
                profile: DIMINISHED_PROFILE,
            },
            whole_tone: {
                notes: WHOLE_TONE_SCALE,
                profile: WHOLE_TONE_PROFILE,
            },
        },
    },
};

