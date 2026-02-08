import { Param } from "./index.ts";

const chordsMap: Record<number, ChordCategory> = {
 [1 << 0]: "tonal_core",
 [1 << 1]: "open_modal",
 [1 << 2]: "rich_tertian",
 [1 << 3]: "altered_expressive",
 [1 << 4]: "symmetrical_tension",
 [1 << 5]: "clusters",
};

export const mapParamToChordCategories = (param: Param | undefined) : ChordCategory[] => {

    if (!param) return ["tonal_core"];

    const mask = Math.floor(param.value);
    const enabled: ChordCategory[] = [];

    for (const bit in chordsMap) {
        const bitNum = Number(bit);
        if ((mask & bitNum) !== 0) enabled.push(chordsMap[bitNum]);
    }

    return enabled.length > 0 ? enabled : (["tonal_core"] as ChordCategory[]);
}

export type ChordCategory =
  | "tonal_core"
  | "open_modal"
  | "rich_tertian"
  | "altered_expressive"
  | "symmetrical_tension"
  | "clusters";

export const CHORD_CATEGORIES: Record<
  ChordCategory,
  {
    description: string;
    chords: Record<string, Set<number>>;
  }
> = {

  // ─────────────────────────────────────────
  // TONAL CORE — herkenbare pop / tonale akkoorden
  // ─────────────────────────────────────────
  tonal_core: {
    description:
      "Herkenbare tonale akkoorden uit pop, rock en folk (majeur, mineur, sus en add).",
    chords: {
      major: new Set([0, 4, 7]),
      minor: new Set([0, 3, 7]),
      
    },
  },

  // ─────────────────────────────────────────
  // OPEN / MODAL — zwevend, niet-functioneel
  // ─────────────────────────────────────────
  open_modal: {
    description:
      "Open en modale harmonie zonder sterke functionele richting.",
    chords: {
      sus2: new Set([0, 2, 7]),
      sus4: new Set([0, 5, 7]),
      add4_add11: new Set([0, 4, 5, 7]),

      quartal_triad: new Set([0, 5, 10]),
      quartal_stack: new Set([0, 5, 10, 3]), // 0,5,10,15 mod 12
    },
  },

  // ─────────────────────────────────────────
  // RICH TERTIAN — 7th-achtige klankfamilies
  // ─────────────────────────────────────────
  rich_tertian: {
    description:
      "Rijke vierklanken (7th-achtige harmonie, jazz / filmisch).",
    chords: {
      dominant_like: new Set([0, 4, 7, 10]),

      minor7_major6_family: new Set([0, 3, 7, 10]), // ≈ maj6 inversie
      major7: new Set([0, 4, 7, 11]),
      minor_major7: new Set([0, 3, 7, 11]),
    },
  },

  // ─────────────────────────────────────────
  // ALTERED / EXPRESSIVE — duidelijke spanning
  // ─────────────────────────────────────────
  altered_expressive: {
    description:
      "Expressieve akkoorden met duidelijke spanning of vervreemding.",
    chords: {
      diminished_triad: new Set([0, 3, 6]),
      augmented_triad: new Set([0, 4, 8]),
      augmented_tertian: new Set([0, 4, 8, 10]),
      minor_major7: new Set([0, 3, 7, 11]),
    },
  },

  // ─────────────────────────────────────────
  // SYMMETRICAL TENSION — geen duidelijke grondtoon
  // ─────────────────────────────────────────
  symmetrical_tension: {
    description:
      "Symmetrische akkoorden zonder duidelijke tonale zwaartekracht.",
    chords: {
      diminished_seventh: new Set([0, 3, 6, 9]),
      whole_tone_subset: new Set([0, 2, 4, 6]),
      whole_tone_color: new Set([0, 4, 8, 10]),
    },
  },

  // ─────────────────────────────────────────
  // CLUSTERS — textuur i.p.v. harmonie
  // ─────────────────────────────────────────
  clusters: {
    description:
      "Toonclusters en dichte samenklanken (textuur boven harmonie).",
    chords: {
      chromatic_cluster_3: new Set([0, 1, 2]),
      diatonic_cluster: new Set([0, 2, 4]),
      dense_cluster: new Set([0, 1, 3]),
    },
  },
};
