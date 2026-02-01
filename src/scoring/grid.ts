import { framesPerQNote, Note } from "../notes/index.ts";
import { scoreValue } from "./util.ts";
import { Param, ScoringsFunction } from "./index.ts";
import { limitMelody } from "./util.ts";

// export const scoreGridness16th: ScoringsFunction = ({
// 	melody,
// 	params,
// 	voiceSplits,
// 	voices,
// }) => {
// 	melody = limitMelody(melody, voiceSplits, voices);
// 	if (melody.length === 0) {
// 		return null;
// 	}
// 	const optimumParam = params.length > 0 ? params[0].value : 0.5;
// 	const optimum = optimumParam || 1;

// 	const gridDiffs = melody
// 		.map((note) => {
// 			const mod = framesPerQNote / 4;
// 			return Math.min(-note.position % mod, note.position % mod);
// 		})
// 		.sort((a, b) => a - b);

// 	const optimumNoteCount = Math.round(optimum * melody.length);
// 	const average = gridDiffs.slice(0, optimumNoteCount).reduce(
// 		(sum, val) => sum + val,
// 		0,
// 	) / optimumNoteCount;

// 	return scoreValue(0, average, framesPerQNote / 8) * 2 - 1;
// };

// import { framesPerQNote } from "../notes/index.ts";
// import { scoreValue } from "./util.ts";
// import { ScoringsFunction } from "./index.ts";
// import { limitMelody } from "./util.ts";

type GridId = "8" | "16" | "8t";

const gridMap: Record<number, GridId> = {
	1: "8",
	[1 << 1]: "16",
	[1 << 2]: "8t",
}

const GRID_MOD: Record<GridId, number> = {
	"8": framesPerQNote / 2,
	"16": framesPerQNote / 4,
	"8t": framesPerQNote / 3,
};

function clamp01(x: number): number {
	return Math.max(0, Math.min(1, x));
}

function distToGrid(pos: number, mod: number): number {
	// distance to nearest gridline in [0, mod/2]
	const m = ((pos % mod) + mod) % mod;
	return Math.min(m, mod - m);
}

function softWindowWeight(dist: number, mod: number): number {
	// 1 at gridline, 0 at halfway point
	const half = mod / 2;
	return clamp01(1 - dist / half);
}

function normalizeVol(v: number): number {
	// Most likely in your system: MIDI-ish 0..127
	return clamp01(v / 127);
}

function getEnabledGrids(param: Param): GridId[] {
	const mask = Math.floor(param.value);

	const enabled: GridId[] = [];

	for (const bit in gridMap) {
		const bitNum = Number(bit);
		if ((mask & bitNum) !== 0) {
			enabled.push(gridMap[bitNum]);
		}
	}

	// Fallback to 16th grid if nothing is enabled
	return enabled.length > 0 ? enabled : (["16"] as GridId[]);
}

function pulseContrastB2(
	notes: Note[],
	mod: number,
): number {
	// Build energy per grid-step within one quarter-note phase.
	// Only note-ons matter; each note contributes with soft window * normalized volume.
	const stepsPerQ = Math.round(framesPerQNote / mod); // 2, 4, 3
	const energy = new Array<number>(stepsPerQ).fill(0);

	for (const n of notes) {
		const dist = distToGrid(n.position, mod);
		const w = softWindowWeight(dist, mod);
		const v = normalizeVol(n.volume);
		const contrib = w * v;

		// Which step (phase) inside the quarter note?
		const phaseFrames = ((n.position % framesPerQNote) + framesPerQNote) % framesPerQNote;
		const step = Math.floor(phaseFrames / mod);
		if (step >= 0 && step < stepsPerQ) energy[step] += contrib;
	}

	// Define strong/weak steps (B2)
	let strong: number[] = [];
	let weak: number[] = [];

	if (stepsPerQ === 2) {
		// 8ths: [0]=onbeat, [1]=offbeat
		strong = [0];
		weak = [1];
	} else if (stepsPerQ === 4) {
		// 16ths: strong are 8th positions (0,2), weak are (1,3)
		strong = [0, 2];
		weak = [1, 3];
	} else if (stepsPerQ === 3) {
		// 8th-triplets: treat [0] as strongest, [1,2] weaker
		strong = [0];
		weak = [1, 2];
	} else {
		// Fallback: no contrast info
		return 0;
	}

	const mean = (idxs: number[]) =>
		idxs.reduce((s, i) => s + (energy[i] ?? 0), 0) / Math.max(1, idxs.length);

	const s = mean(strong);
	const w = mean(weak);

	// Contrast in [-1..1], 0 means no preference
	const eps = 1e-9;
	const contrast = (s - w) / (s + w + eps);
	return Math.max(-1, Math.min(1, contrast));
}

function gridScore(
	melody: Note[],
	mod: number,
	optimumFraction: number,
): number {
	// Keep your existing behavior: consider only the "best aligned" subset.
	const diffs = melody
		.map((note) => ({
			note,
			dist: distToGrid(note.position, mod),
		}))
		.sort((a, b) => a.dist - b.dist);

	const optimumNoteCount = Math.max(
		1,
		Math.min(melody.length, Math.round(optimumFraction * melody.length)),
	);

	const best = diffs.slice(0, optimumNoteCount).map((x) => x.note);

	// 1) On-gridness dominates.
	// Use velocity-weighted average of distance, with a soft window.
	let weightedDistSum = 0;
	let weightSum = 0;

	for (const n of best) {
		const dist = distToGrid(n.position, mod);
		const w = softWindowWeight(dist, mod);
		const v = normalizeVol(n.volume);
		const weight = v * w;

		weightedDistSum += dist * weight;
		weightSum += weight;
	}

	// If everything is zero-volume (or missing), fall back to unweighted distance.
	let avgDist: number;
	if (weightSum > 1e-9) {
		avgDist = weightedDistSum / weightSum;
	} else {
		avgDist =
			best.reduce((s, n) => s + distToGrid(n.position, mod), 0) / best.length;
	}

	// Convert distance -> 0..1 score (same shape as your original)
	// "optimalValue" is 0 deviation; maxDeviation chosen similarly to your 16th scorer.
	const onGrid01 = scoreValue(0, avgDist, framesPerQNote / 8);

	// 2) Pulse contrast bonus (B2), smaller influence than on-gridness.
	const contrast = pulseContrastB2(best, mod); // [-1..1]
	const contrast01 = 0.5 + 0.5 * contrast;

	// You said clear pulse is less important than notes on the grid.
	const pulseWeight = 0.25;
	const combined01 = (1 - pulseWeight) * onGrid01 + pulseWeight * contrast01;

	// Map to [-1..1] like your existing scorer
	return combined01 * 2 - 1;
}

export const scoreGridness16th: ScoringsFunction = ({
	melody,
	params,
	voiceSplits,
	voices,
}) => {
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) return null;

	// Keep existing param[0] meaning (optimum fraction)
	const optimumParam = params.length > 0 ? params[0].value : 0.5;
	const optimum = optimumParam || 1;
	const enabledParam = params[1]

	const enabled = getEnabledGrids(enabledParam);

	let bestScore: number | null = null;

	for (const grid of enabled) {
		const mod = GRID_MOD[grid];
		const s = gridScore(melody, mod, optimum);
		if (bestScore === null || s > bestScore) bestScore = s;
	}

	return bestScore;
};

