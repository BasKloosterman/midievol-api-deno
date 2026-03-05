import { framesPerQNote, Note } from "../notes/index.ts";
import { normalizeIntervals } from "./util.ts";
import { ScoringsFunction } from "./index.ts";
import { limitMelody } from "./util.ts";

function meanQuantError(deltas: number[], step: number): number {
	if (deltas.length === 0) return 0;
	let err = 0;
	for (const d of deltas) {
		const k = Math.max(1, Math.round(d / step));
		const q = k * step;
		err += Math.abs(d - q) / step; // normalize by step
	}
	return err / deltas.length;
}

function estimateTop2SubdivisionDivisors(deltas: number[]): number[] {
	// Muzikaal nuttige kandidaten (binary + triolen + kwintolen)
	const candidates = [3, 4, 5, 6, 8, 10, 12, 15, 16, 20, 24];

	// Score per candidate: quantization error + tiny penalty for being very fine
	// (klein, want jij zegt: hij mag best fijn kiezen)
	const scored = candidates.map((D) => {
		const step = framesPerQNote / D;
		const err = meanQuantError(deltas, step);
		const finePenalty = 0.005 * (D / 24); // heel klein
		return { D, score: err + finePenalty };
	});

	scored.sort((a, b) => a.score - b.score);

	const best = scored[0];
	const second = scored[1];

	// Return top-2 (altijd), gesorteerd grof->fijn of fijn->grof maakt niet uit
	return [best.D, second.D];
}

function calculateRhythmicDistances(melody: Note[]): number[] {
	const positions = melody.map((n) => n.position);
	const deltas = positions.slice(1).map((pos, i) => pos - positions[i]);

	if (deltas.length === 0) return deltas;

	const [d1, d2] = estimateTop2SubdivisionDivisors(deltas);
	const step1 = framesPerQNote / d1;
	const step2 = framesPerQNote / d2;

	// Neem de fijnste van de twee als "min distance" om kleine muzikale subdivisies toe te laten
	const minStep = Math.min(step1, step2);

	// Filter ornament/jitter weg, maar behoud alles dat ~minStep of groter is
	// (Als je merkt dat hij teveel wegfiltert: zet 1.0 -> 0.9)
	const minDist = 1.0 * minStep;

	return deltas.filter((d) => d >= minDist);
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
	let extractedLen = 0; // ✅ nodig voor numWindows normalisatie

	if (type === "melodic") {
		motifMap = findMotifs(melody, minNotes, maxNotes, normalizeIntervals);
		extractedLen = normalizeIntervals(melody).length;
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
		extractedLen = calculateRhythmicDistances(melody).length;
		frequencyScore = Array.from(motifMap.entries())
			.filter(([, freq]) => freq > 1)
			.reduce((acc, [motif, freq]) => {
				const parsed = JSON.parse(motif);
				return acc + freq * (parsed.length ** 2);
			}, 0);
	}

	let diversityScore =
		Array.from(motifMap.entries()).filter(([, freq]) => freq > 1).length;

	// exact aantal sliding windows dat findMotifs heeft bekeken
	const numWindows = Array.from(
		{ length: maxNotes - minNotes + 1 },
		(_, k) => minNotes + k,
	).reduce((acc, len) => acc + Math.max(0, extractedLen - len + 1), 0);

	if (numWindows > 0) {
		frequencyScore /= numWindows;
		diversityScore /= numWindows; // optioneel maar meestal goed
	}

	const totalScore = frequencyScore + diversityScore;
	return [totalScore, motifMap];
}

export const scoreMelodicMotifs: ScoringsFunction = (
	{ melody, voiceSplits, voices },
) => {
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) {
		return null;
	}
	const [score] = scoreMelody(melody, 2, 8, "melodic");

	return { score, info: [] };
};

export const scoreRhythmicMotifs: ScoringsFunction = (
	{ melody, voiceSplits, voices },
) => {
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) {
		return null;
	}
	const [score] = scoreMelody(melody, 2, 8, "rhythmic");
	return { score, info: [] };
}; 