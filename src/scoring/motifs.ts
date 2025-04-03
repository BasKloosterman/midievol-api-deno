import { framesPerQNote, Note } from "../notes/index.ts";
import { normalizeIntervals } from "./util.ts";
import { ScoringsFunction } from "./index.ts";
import { limitMelody } from "./util.ts";

function calculateRhythmicDistances(melody: Note[]): number[] {
	const positions = melody.map((n) => n.position);
	return positions
		.slice(1)
		.map((pos, i) => pos - positions[i])
		.filter((d) => d >= framesPerQNote / 4);
}

function* slidingWindow<T>(list: T[], windowSize: number): Generator<T[]> {
	for (let i = 0; i <= list.length - windowSize; i++) {
		yield list.slice(i, i + windowSize);
	}
}

function findMotifs(
	melody: Note[],
	minNotes: number,
	maxNotes: number,
	extractor: (melody: Note[]) => any[],
): Map<string, number> {
	const motifCounts = new Map<string, number>();
	const extracted = extractor(melody);

	for (let len = minNotes; len <= maxNotes; len++) {
		for (const segment of slidingWindow(extracted, len)) {
			const key = JSON.stringify(segment);
			motifCounts.set(key, (motifCounts.get(key) || 0) + 1);
		}
	}

	return motifCounts;
}

function notTooManySameNotes(intervals: number[]): number {
	const numZeros = intervals.filter((i) => i === 0).length;
	const numNotes = intervals.length + 1;
	return numZeros < Math.round(numNotes / 3) ? 2 : 1;
}

function calculateDiversity(melody: Note[], optimum = 0.7): number {
	const unique = new Set(melody.map((n) => Math.round(n.pitch / 10))).size;
	return Math.min(optimum, unique / melody.length) / optimum;
}

function scoreMelody(
	melody: Note[],
	minNotes = 3,
	maxNotes = 5,
	type: "melodic" | "rhythmic" | "both" = "melodic",
): [number, Map<string, number>] {
	let motifMap = new Map<string, number>();
	let frequencyScore = 0;

	if (type === "melodic") {
		motifMap = findMotifs(melody, minNotes, maxNotes, normalizeIntervals);
		frequencyScore = Array.from(motifMap.entries())
			.filter(([, freq]) => freq > 1)
			.reduce((acc, [motif, freq]) => {
				const parsed = JSON.parse(motif);
				const multiplier = notTooManySameNotes(parsed);
				return acc +
					freq * (parsed.length ** 2) ** multiplier *
						calculateDiversity(melody);
			}, 0);
	} else if (type === "rhythmic") {
		motifMap = findMotifs(
			melody,
			minNotes,
			maxNotes,
			calculateRhythmicDistances,
		);
		frequencyScore = Array.from(motifMap.entries())
			.filter(([, freq]) => freq > 1)
			.reduce((acc, [motif, freq]) => {
				const parsed = JSON.parse(motif);
				return acc + freq * (parsed.length ** 2);
			}, 0);
	}

	const diversityScore =
		Array.from(motifMap.entries()).filter(([, freq]) => freq > 1).length;
	const totalScore = frequencyScore + diversityScore;
	return [totalScore, motifMap];
}

export const scoreMelodicMotifs: ScoringsFunction = ({ melody, voiceSplits, voices }) => {
	melody = limitMelody(melody, voiceSplits, voices)
	if (melody.length === 0) {
		return null
	}
	const [score] = scoreMelody(melody, 2, 8, "melodic");
	return score;
};

export const scoreRhythmicMotifs: ScoringsFunction = ({ melody, voiceSplits, voices }) => {
	melody = limitMelody(melody, voiceSplits, voices)
if (melody.length === 0) {
	return null
}
	const [score] = scoreMelody(melody, 2, 8, "rhythmic");
	return score;
};
