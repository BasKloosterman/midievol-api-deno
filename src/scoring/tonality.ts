import { ScoringsFunction } from "./index.ts";
import { limitMelody, pearsonCorr, rotate } from "./util.ts";

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

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

function calculateTonalityScore(pitches: number[]) {
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
	let bestKey: [number, "major" | "minor"] | null = null;

	for (let root = 0; root < 12; root++) {
		const majorCorr = pearsonCorr(
			noteDistribution,
			rotate(MAJOR_PROFILE, 12-root),
		);
		const minorCorr = pearsonCorr(
			noteDistribution,
			rotate(MINOR_PROFILE, 12-root),
		);

		if (majorCorr > bestScore) {
			bestScore = majorCorr;
			bestKey = [root, "major"];
		}
		if (minorCorr > bestScore) {
			bestScore = minorCorr;
			bestKey = [root, "minor"];
		}
	}

	if (!bestKey) throw new Error("No best key found");

	const [root, mode] = bestKey;
	const scale = mode === "major" ? MAJOR_SCALE : MINOR_SCALE;
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

export const scoreTonality: ScoringsFunction = (
	{ melody, voiceSplits, voices },
) => {
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) {
		return null;
	}
	const roundedPitches = melody.map((n) => Math.round(n.pitch / 10));
	const result = calculateTonalityScore(roundedPitches);

	return result.tonalityScore;
};
