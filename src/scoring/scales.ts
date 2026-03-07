/* =========================
   Types
========================= */

export type ScaleName =
    | "major"
    | "natural_minor"
    | "harmonic_minor"
    | "melodic_minor"
    | "dorian"
    | "phrygian"
    | "lydian"
    | "mixolydian"
    | "locrian"
    | "major_pentatonic"
    | "minor_pentatonic"
    | "blues"
    | "egyptian_pentatonic"
    | "whole_tone"
    | "diminished"
    | "phrygian_dominant"
    | "double_harmonic"
    | "hungarian_minor"
    | "hirajoshi"
    | "insen";

export type ScaleFamily =
    | "major_family"
    | "minor_family"
    | "modal"
    | "pentatonic"
    | "symmetric"
    | "world_color"

    // vibe
    | "bright"
    | "dark"
    | "dreamy"
    | "earthy"
    | "mystical"
    | "tense"
    | "bluesy"
    | "cinematic"
    | "floating"
    | "ritual"

    // structure
    | "pentatonic_structure"
    | "hexatonic"
    | "heptatonic"
    | "octatonic"
    | "open"
    | "stable"
    | "unstable"

    // world influence
    | "africa_influenced"
    | "asia_influenced"
    | "middle_east_influenced"
    | "european_folk"
    | "blues_american"
    | "global_folk";

export type FamilyDefinition = {
    scales: Partial<
        Record<
            ScaleName,
            {
                notes: number[];
                profile: number[];
            }
        >
    >;
    description: string;
};

/* =========================
   Absolute scale constants
========================= */

export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
export const MAJOR_SCALE_PROFILE = [
    6.33, 2.2, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];

export const NATURAL_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
export const NATURAL_MINOR_SCALE_PROFILE = [
    6.33, 2.88, 3.48, 4.09, 2.52, 3.66, 2.29, 4.38, 2.2, 5.19, 2.33, 2.39,
];

export const HARMONIC_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 11];
export const HARMONIC_MINOR_SCALE_PROFILE = [
    6.2, 0.5, 3.8, 4.6, 0.5, 4.2, 0.5, 5.0, 4.0, 0.5, 0.5, 4.8,
];

export const MELODIC_MINOR_SCALE = [0, 2, 3, 5, 7, 9, 11];
export const MELODIC_MINOR_SCALE_PROFILE = [
    6.2, 0.5, 3.8, 4.5, 0.5, 4.1, 0.5, 5.0, 0.5, 4.2, 0.5, 4.6,
];

export const DORIAN_SCALE = [0, 2, 3, 5, 7, 9, 10];
export const DORIAN_SCALE_PROFILE = [
    6.1, 0.5, 3.8, 4.5, 0.5, 4.1, 2.8, 5.0, 0.5, 4.2, 2.5, 0.5,
];

export const PHRYGIAN_SCALE = [0, 1, 3, 5, 7, 8, 10];
export const PHRYGIAN_SCALE_PROFILE = [
    6.0, 4.3, 0.5, 4.4, 0.5, 4.0, 0.5, 5.0, 4.0, 0.5, 4.2, 0.5,
];

export const LYDIAN_SCALE = [0, 2, 4, 6, 7, 9, 11];
export const LYDIAN_SCALE_PROFILE = [
    6.35, 2.23, 3.48, 2.33, 4.38, 2.52, 4.09, 5.19, 2.39, 3.66, 2.29, 2.88,
];

export const MIXOLYDIAN_SCALE = [0, 2, 4, 5, 7, 9, 10];
export const MIXOLYDIAN_SCALE_PROFILE = [
    6.2, 2.1, 3.5, 2.3, 4.3, 4.0, 2.4, 5.1, 2.3, 3.6, 4.0, 0.5,
];

export const LOCRIAN_SCALE = [0, 1, 3, 5, 6, 8, 10];
export const LOCRIAN_SCALE_PROFILE = [
    6.0, 0.5, 3.6, 4.2, 0.5, 4.0, 4.5, 0.5, 4.0, 0.5, 4.1, 0.5,
];

export const MAJOR_PENTATONIC_SCALE = [0, 2, 4, 7, 9];
export const MAJOR_PENTATONIC_SCALE_PROFILE = [
    6.0, 0.5, 4.0, 0.5, 4.5, 0.5, 0.5, 4.8, 0.5, 4.0, 0.5, 0.5,
];

export const MINOR_PENTATONIC_SCALE = [0, 3, 5, 7, 10];
export const MINOR_PENTATONIC_SCALE_PROFILE = [
    6.0, 0.5, 0.5, 4.2, 0.5, 4.0, 0.5, 4.8, 4.2, 0.5, 4.0, 0.5,
];

export const BLUES_SCALE = [0, 3, 5, 6, 7, 10];
export const BLUES_SCALE_PROFILE = [
    6.0, 0.5, 0.5, 4.0, 0.5, 4.0, 3.8, 4.8, 4.0, 0.5, 4.0, 0.5,
];

export const EGYPTIAN_PENTATONIC_SCALE = [0, 2, 5, 7, 10];
export const EGYPTIAN_PENTATONIC_SCALE_PROFILE = [
    6.0, 0.5, 4.1, 0.5, 0.5, 4.2, 0.5, 4.8, 0.5, 0.5, 4.0, 0.5,
];

export const WHOLE_TONE_SCALE = [0, 2, 4, 6, 8, 10];
export const WHOLE_TONE_SCALE_PROFILE = [
    4.5, 0.5, 4.0, 0.5, 4.0, 0.5, 4.0, 0.5, 4.0, 0.5, 4.0, 0.5,
];

export const DIMINISHED_SCALE = [0, 2, 3, 5, 6, 8, 9, 11];
export const DIMINISHED_SCALE_PROFILE = [
    6.0, 0.5, 4.5, 4.0, 0.5, 4.5, 4.0, 0.5, 4.5, 3.5, 0.5, 4.0,
];

export const PHRYGIAN_DOMINANT_SCALE = [0, 1, 4, 5, 7, 8, 10];
export const PHRYGIAN_DOMINANT_SCALE_PROFILE = [
    6.2, 4.0, 0.5, 0.5, 4.5, 4.0, 0.5, 5.0, 4.0, 0.5, 0.5, 4.6,
];

export const DOUBLE_HARMONIC_SCALE = [0, 1, 4, 5, 7, 8, 11];
export const DOUBLE_HARMONIC_SCALE_PROFILE = [
    6.1, 4.2, 0.5, 0.5, 4.4, 4.0, 0.5, 5.0, 4.0, 0.5, 0.5, 4.7,
];

export const HUNGARIAN_MINOR_SCALE = [0, 2, 3, 6, 7, 8, 11];
export const HUNGARIAN_MINOR_SCALE_PROFILE = [
    6.1, 0.5, 3.9, 4.5, 0.5, 0.5, 4.2, 5.0, 4.1, 0.5, 0.5, 4.7,
];

export const HIRAJOSHI_SCALE = [0, 2, 3, 7, 8];
export const HIRAJOSHI_SCALE_PROFILE = [
    6.0, 0.5, 4.0, 4.2, 0.5, 0.5, 0.5, 4.8, 4.0, 0.5, 0.5, 0.5,
];

export const INSEN_SCALE = [0, 1, 5, 7, 10];
export const INSEN_SCALE_PROFILE = [
    6.0, 4.1, 0.5, 0.5, 0.5, 4.0, 0.5, 4.8, 0.5, 0.5, 4.0, 0.5,
];

/* =========================
   Reusable scale registry
========================= */

export const SCALE_DEFINITIONS: Record<
    ScaleName,
    { notes: number[]; profile: number[] }
> = {
    major: { notes: MAJOR_SCALE, profile: MAJOR_SCALE_PROFILE },
    natural_minor: { notes: NATURAL_MINOR_SCALE, profile: NATURAL_MINOR_SCALE_PROFILE },
    harmonic_minor: { notes: HARMONIC_MINOR_SCALE, profile: HARMONIC_MINOR_SCALE_PROFILE },
    melodic_minor: { notes: MELODIC_MINOR_SCALE, profile: MELODIC_MINOR_SCALE_PROFILE },
    dorian: { notes: DORIAN_SCALE, profile: DORIAN_SCALE_PROFILE },
    phrygian: { notes: PHRYGIAN_SCALE, profile: PHRYGIAN_SCALE_PROFILE },
    lydian: { notes: LYDIAN_SCALE, profile: LYDIAN_SCALE_PROFILE },
    mixolydian: { notes: MIXOLYDIAN_SCALE, profile: MIXOLYDIAN_SCALE_PROFILE },
    locrian: { notes: LOCRIAN_SCALE, profile: LOCRIAN_SCALE_PROFILE },
    major_pentatonic: { notes: MAJOR_PENTATONIC_SCALE, profile: MAJOR_PENTATONIC_SCALE_PROFILE },
    minor_pentatonic: { notes: MINOR_PENTATONIC_SCALE, profile: MINOR_PENTATONIC_SCALE_PROFILE },
    blues: { notes: BLUES_SCALE, profile: BLUES_SCALE_PROFILE },
    egyptian_pentatonic: { notes: EGYPTIAN_PENTATONIC_SCALE, profile: EGYPTIAN_PENTATONIC_SCALE_PROFILE },
    whole_tone: { notes: WHOLE_TONE_SCALE, profile: WHOLE_TONE_SCALE_PROFILE },
    diminished: { notes: DIMINISHED_SCALE, profile: DIMINISHED_SCALE_PROFILE },
    phrygian_dominant: { notes: PHRYGIAN_DOMINANT_SCALE, profile: PHRYGIAN_DOMINANT_SCALE_PROFILE },
    double_harmonic: { notes: DOUBLE_HARMONIC_SCALE, profile: DOUBLE_HARMONIC_SCALE_PROFILE },
    hungarian_minor: { notes: HUNGARIAN_MINOR_SCALE, profile: HUNGARIAN_MINOR_SCALE_PROFILE },
    hirajoshi: { notes: HIRAJOSHI_SCALE, profile: HIRAJOSHI_SCALE_PROFILE },
    insen: { notes: INSEN_SCALE, profile: INSEN_SCALE_PROFILE },
};

/* =========================
   Families
========================= */

export const SCALES: Record<ScaleFamily, FamilyDefinition> = {
    major_family: {
        scales: {
            major: SCALE_DEFINITIONS.major,
            mixolydian: SCALE_DEFINITIONS.mixolydian,
        },
        description: "Major-oriented scales and modes.",
    },

    minor_family: {
        scales: {
            natural_minor: SCALE_DEFINITIONS.natural_minor,
            harmonic_minor: SCALE_DEFINITIONS.harmonic_minor,
            melodic_minor: SCALE_DEFINITIONS.melodic_minor,
            dorian: SCALE_DEFINITIONS.dorian,
            mixolydian: SCALE_DEFINITIONS.mixolydian, // alleen behouden als je deze echt hier wilt
        },
        description: "Minor-oriented tonal and modal scales.",
    },

    modal: {
        scales: {
            dorian: SCALE_DEFINITIONS.dorian,
            phrygian: SCALE_DEFINITIONS.phrygian,
            lydian: SCALE_DEFINITIONS.lydian,
            mixolydian: SCALE_DEFINITIONS.mixolydian,
            locrian: SCALE_DEFINITIONS.locrian,
        },
        description: "Church modes and modal variants.",
    },

    pentatonic: {
        scales: {
            major_pentatonic: SCALE_DEFINITIONS.major_pentatonic,
            minor_pentatonic: SCALE_DEFINITIONS.minor_pentatonic,
            blues: SCALE_DEFINITIONS.blues,
            egyptian_pentatonic: SCALE_DEFINITIONS.egyptian_pentatonic,
            hirajoshi: SCALE_DEFINITIONS.hirajoshi,
            insen: SCALE_DEFINITIONS.insen,
        },
        description: "Pentatonic and pentatonic-related scales.",
    },

    symmetric: {
        scales: {
            whole_tone: SCALE_DEFINITIONS.whole_tone,
            diminished: SCALE_DEFINITIONS.diminished,
        },
        description: "Symmetrical scales with repeating interval structures.",
    },

    world_color: {
        scales: {
            phrygian_dominant: SCALE_DEFINITIONS.phrygian_dominant,
            double_harmonic: SCALE_DEFINITIONS.double_harmonic,
            hungarian_minor: SCALE_DEFINITIONS.hungarian_minor,
        },
        description: "Scales with strong regional or exotic color.",
    },

    bright: {
        scales: {
            major: SCALE_DEFINITIONS.major,
            lydian: SCALE_DEFINITIONS.lydian,
            major_pentatonic: SCALE_DEFINITIONS.major_pentatonic,
        },
        description: "Bright and uplifting scales.",
    },

    dark: {
        scales: {
            natural_minor: SCALE_DEFINITIONS.natural_minor,
            phrygian: SCALE_DEFINITIONS.phrygian,
            locrian: SCALE_DEFINITIONS.locrian,
            hungarian_minor: SCALE_DEFINITIONS.hungarian_minor,
            hirajoshi: SCALE_DEFINITIONS.hirajoshi,
        },
        description: "Dark and somber scales.",
    },

    dreamy: {
        scales: {
            melodic_minor: SCALE_DEFINITIONS.melodic_minor,
            lydian: SCALE_DEFINITIONS.lydian,
            whole_tone: SCALE_DEFINITIONS.whole_tone,
        },
        description: "Dreamy, airy, and impressionistic scales.",
    },

    earthy: {
        scales: {
            dorian: SCALE_DEFINITIONS.dorian,
            mixolydian: SCALE_DEFINITIONS.mixolydian,
            minor_pentatonic: SCALE_DEFINITIONS.minor_pentatonic,
            blues: SCALE_DEFINITIONS.blues,
        },
        description: "Grounded, folk-like, and groove-oriented scales.",
    },

    mystical: {
        scales: {
            harmonic_minor: SCALE_DEFINITIONS.harmonic_minor,
            phrygian: SCALE_DEFINITIONS.phrygian,
            diminished: SCALE_DEFINITIONS.diminished,
            phrygian_dominant: SCALE_DEFINITIONS.phrygian_dominant,
            double_harmonic: SCALE_DEFINITIONS.double_harmonic,
            hirajoshi: SCALE_DEFINITIONS.hirajoshi,
        },
        description: "Mystical and otherworldly scales.",
    },

    tense: {
        scales: {
            harmonic_minor: SCALE_DEFINITIONS.harmonic_minor,
            phrygian: SCALE_DEFINITIONS.phrygian,
            locrian: SCALE_DEFINITIONS.locrian,
            diminished: SCALE_DEFINITIONS.diminished,
            phrygian_dominant: SCALE_DEFINITIONS.phrygian_dominant,
            hungarian_minor: SCALE_DEFINITIONS.hungarian_minor,
        },
        description: "Tension-rich and unstable scales.",
    },

    bluesy: {
        scales: {
            minor_pentatonic: SCALE_DEFINITIONS.minor_pentatonic,
            blues: SCALE_DEFINITIONS.blues,
        },
        description: "Blues-based scales and colors.",
    },

    cinematic: {
        scales: {
            major: SCALE_DEFINITIONS.major,
            melodic_minor: SCALE_DEFINITIONS.melodic_minor,
            lydian: SCALE_DEFINITIONS.lydian,
            whole_tone: SCALE_DEFINITIONS.whole_tone,
            diminished: SCALE_DEFINITIONS.diminished,
        },
        description: "Scales with strong cinematic expressiveness.",
    },

    floating: {
        scales: {
            lydian: SCALE_DEFINITIONS.lydian,
            whole_tone: SCALE_DEFINITIONS.whole_tone,
            insen: SCALE_DEFINITIONS.insen,
        },
        description: "Open, suspended, and floating scales.",
    },

    ritual: {
        scales: {
            phrygian_dominant: SCALE_DEFINITIONS.phrygian_dominant,
            double_harmonic: SCALE_DEFINITIONS.double_harmonic,
            insen: SCALE_DEFINITIONS.insen,
        },
        description: "Ceremonial and ritual-like colors.",
    },

    pentatonic_structure: {
        scales: {
            major_pentatonic: SCALE_DEFINITIONS.major_pentatonic,
            minor_pentatonic: SCALE_DEFINITIONS.minor_pentatonic,
            egyptian_pentatonic: SCALE_DEFINITIONS.egyptian_pentatonic,
            hirajoshi: SCALE_DEFINITIONS.hirajoshi,
            insen: SCALE_DEFINITIONS.insen,
        },
        description: "Scales built on five-note structures.",
    },

    hexatonic: {
        scales: {
            blues: SCALE_DEFINITIONS.blues,
            whole_tone: SCALE_DEFINITIONS.whole_tone,
        },
        description: "Six-note scales.",
    },

    heptatonic: {
        scales: {
            major: SCALE_DEFINITIONS.major,
            natural_minor: SCALE_DEFINITIONS.natural_minor,
            harmonic_minor: SCALE_DEFINITIONS.harmonic_minor,
            melodic_minor: SCALE_DEFINITIONS.melodic_minor,
            dorian: SCALE_DEFINITIONS.dorian,
            phrygian: SCALE_DEFINITIONS.phrygian,
            lydian: SCALE_DEFINITIONS.lydian,
            mixolydian: SCALE_DEFINITIONS.mixolydian,
            locrian: SCALE_DEFINITIONS.locrian,
            phrygian_dominant: SCALE_DEFINITIONS.phrygian_dominant,
            double_harmonic: SCALE_DEFINITIONS.double_harmonic,
            hungarian_minor: SCALE_DEFINITIONS.hungarian_minor,
        },
        description: "Seven-note scales.",
    },

    octatonic: {
        scales: {
            diminished: SCALE_DEFINITIONS.diminished,
        },
        description: "Eight-note scales.",
    },

    open: {
        scales: {
            major_pentatonic: SCALE_DEFINITIONS.major_pentatonic,
            egyptian_pentatonic: SCALE_DEFINITIONS.egyptian_pentatonic,
        },
        description: "Open and consonant interval structures.",
    },

    stable: {
        scales: {
            major: SCALE_DEFINITIONS.major,
            natural_minor: SCALE_DEFINITIONS.natural_minor,
        },
        description: "Stable scales with strong tonal grounding.",
    },

    unstable: {
        scales: {
            locrian: SCALE_DEFINITIONS.locrian,
            whole_tone: SCALE_DEFINITIONS.whole_tone,
            diminished: SCALE_DEFINITIONS.diminished,
        },
        description: "Unstable scales with ambiguous or tense structure.",
    },

    africa_influenced: {
        scales: {
            major_pentatonic: SCALE_DEFINITIONS.major_pentatonic,
            minor_pentatonic: SCALE_DEFINITIONS.minor_pentatonic,
            egyptian_pentatonic: SCALE_DEFINITIONS.egyptian_pentatonic,
        },
        description: "Scales with African or African-diasporic influence.",
    },

    asia_influenced: {
        scales: {
            major_pentatonic: SCALE_DEFINITIONS.major_pentatonic,
            hirajoshi: SCALE_DEFINITIONS.hirajoshi,
            insen: SCALE_DEFINITIONS.insen,
        },
        description: "Scales associated with Asian traditions.",
    },

    middle_east_influenced: {
        scales: {
            harmonic_minor: SCALE_DEFINITIONS.harmonic_minor,
            phrygian: SCALE_DEFINITIONS.phrygian,
            phrygian_dominant: SCALE_DEFINITIONS.phrygian_dominant,
            double_harmonic: SCALE_DEFINITIONS.double_harmonic,
        },
        description: "Scales with Middle Eastern color and intervallic language.",
    },

    european_folk: {
        scales: {
            major: SCALE_DEFINITIONS.major,
            natural_minor: SCALE_DEFINITIONS.natural_minor,
            hungarian_minor: SCALE_DEFINITIONS.hungarian_minor,
        },
        description: "Scales rooted in European folk traditions.",
    },

    blues_american: {
        scales: {
            mixolydian: SCALE_DEFINITIONS.mixolydian,
            minor_pentatonic: SCALE_DEFINITIONS.minor_pentatonic,
            blues: SCALE_DEFINITIONS.blues,
        },
        description: "Scales tied to blues and American vernacular traditions.",
    },

    global_folk: {
        scales: {
            dorian: SCALE_DEFINITIONS.dorian,
            major_pentatonic: SCALE_DEFINITIONS.major_pentatonic,
            egyptian_pentatonic: SCALE_DEFINITIONS.egyptian_pentatonic,
        },
        description: "Widely occurring folk-derived scales across regions.",
    },
};