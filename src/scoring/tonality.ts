import { Param, ScoringsFunction } from "./index.ts";
import { limitMelody, pearsonCorr, rotate } from "./util.ts";

type scales = "major" | "minor" | "altered_pent" | "whole_tone" | "lydian" | "major_pentatonic"

const MAJOR_PROFILE = [
	6.33,
	2.2,
	3.48,
	2.33,
	4.38,
	4.09,
	2.52,
	5.19,
	2.39,
	3.66,
	2.29,
	2.88,
];
const MINOR_PROFILE = [
	6.33,
	2.88,
	3.48,
	4.09,
	2.52,
	3.66,
	2.29,
	4.38,
	2.2,
	5.19,
	2.33,
	2.39,
];
const ALTERED_PENTATONIC_PROFILE = [
	6.0, // 1
	4.5, // b2
	0.5,
	0.5,
	3.5, // 3
	0.5,
	0.5,
	0.5,
	4.0, // #5
	3.0, // 6
	0.5,
	0.5
];

const LYDIAN_PROFILE = [
	6.35, 2.23, 3.48, 2.33, 4.38, 2.52,
	4.09, 5.19, 2.39, 3.66, 2.29, 2.88
  ];
const WHOLE_TONE_PROFILE = [
	4.5, // 1 (tonic)
	0.5, // b2 (out)
	4.0, // 2
	0.5, // b3 (out)
	4.0, // 3
	0.5, // 4 (out)
	4.0, // #4
	0.5, // 5 (out)
	4.0, // #5
	0.5, // 6 (out)
	4.0, // b7
	0.5  // 7 (out)
  ];
const MAJOR_PENTATONIC_PROFILE = [
	6.0, // 1 (tonic)
	0.5, // b2 (out)
	4.0, // 2
	0.5, // b3 (out)
	4.5, // 3
	0.5, // 4 (out)
	0.5, // b5 (out)
	4.8, // 5
	0.5, // b6 (out)
	4.0, // 6
	0.5, // b7 (out)
	0.5  // 7 (out, no leading tone)
  ];


const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
const ALTERED_PENTATONIC_SCALE = [0, 1, 5, 8, 9];
const WHOLE_TONE_SCALE = [0, 2, 4, 6, 8, 10];
const LYDIAN_SCALE = [0, 2, 4, 6, 7, 9, 11];
const MAJOR_PENTATONIC_SCALE = [0, 2, 4, 7, 9];


const scaleFlagMap : Record<number, scales> = {
	1: "major",
	[1 << 1]: "minor",
	[1 << 2]: "altered_pent",
	[1 << 3]: "whole_tone",
	[1 << 4]: "lydian",
	[1 << 5]: "major_pentatonic",
} 

const scaleIdx : Record<scales, number[]> = {
	"major": MAJOR_SCALE,
	"minor": MINOR_SCALE,
	"altered_pent": ALTERED_PENTATONIC_SCALE,
	"whole_tone": WHOLE_TONE_SCALE,
	"lydian": LYDIAN_SCALE,
	"major_pentatonic": MAJOR_PENTATONIC_SCALE,
}

const scalesMap : Record<scales, {scale: number[], profile: number[]}> = {
	"major": {scale: MAJOR_SCALE, profile: MAJOR_PROFILE},
	"minor": {scale: MINOR_SCALE, profile: MINOR_PROFILE},
	"altered_pent": {scale: ALTERED_PENTATONIC_SCALE, profile: ALTERED_PENTATONIC_PROFILE},
	"whole_tone": { scale: WHOLE_TONE_SCALE, profile: LYDIAN_PROFILE},
	"lydian": { scale: LYDIAN_SCALE, profile: WHOLE_TONE_PROFILE},
	"major_pentatonic": { scale: MAJOR_PENTATONIC_SCALE, profile: MAJOR_PENTATONIC_PROFILE}
}

function calculateTonalityScore(pitches: number[], scales: scales[]) {
	if (pitches.length === 0) {
		throw new Error("Note list must not be empty.");
	}

	const noteCounts = Array(12).fill(0);
	for (const pitch of pitches) {
		noteCounts[pitch % 12]++;
	}

	const totalNotes = noteCounts.reduce((a, b) => a + b, 0);
	const noteDistribution = noteCounts.map((c) => c / totalNotes);

	let bestScore = -1;
	let bestKey: [number, scales] | null = null;

	for (let root = 0; root < 12; root++) {
		for (const scale of scales) {
			const curScore = pearsonCorr(
				noteDistribution,
				rotate(scalesMap[scale].profile, 12-root),
			);

			if (curScore > bestScore) {
				bestScore = curScore;
				bestKey = [root, scale];
			}
		}
	}

	if (!bestKey) throw new Error("No best key found");

	const [root, mode] = bestKey;
	const scale = scaleIdx[mode];
	const scaleNotes = scale.map((interval) => (root + interval) % 12);

	const inScaleCount = scaleNotes.reduce(
		(sum, pitch) => sum + noteCounts[pitch],
		0,
	);
	const outOfScaleCount = totalNotes - inScaleCount;
	const tonalScore = (inScaleCount - outOfScaleCount) / totalNotes;

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
		tonalityScore: tonalScore,
	};
}

function getEnabledScales(param: Param | undefined): scales[] {
	if (!param) return ["major"];

	const mask = Math.floor(param.value);
	const enabled: scales[] = [];

	for (const bit in scaleFlagMap) {
		const bitNum = Number(bit);
		if ((mask & bitNum) !== 0) {
			enabled.push(scaleFlagMap[bitNum])
		};
	}

	return enabled.length > 0 ? enabled : (["major"] as scales[]);
}

export const scoreTonality: ScoringsFunction = (
	{ melody, voiceSplits, voices, params },
) => {
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) {
		return null;
	}
	const roundedPitches = melody.map((n) => Math.round(n.pitch / 10));

	const result = calculateTonalityScore(roundedPitches, getEnabledScales(params[0]));

	return result.tonalityScore;
};
