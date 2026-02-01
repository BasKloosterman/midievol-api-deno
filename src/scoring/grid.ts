import { framesPerQNote, Note } from "../notes/index.ts";
import { scoreValue } from "./util.ts";
import { Param, ScoringsFunction } from "./index.ts";
import { limitMelody } from "./util.ts";

type GridId = "8" | "16" | "8t";

const gridMap: Record<number, GridId> = {
	1: "8",
	[1 << 1]: "16",
	[1 << 2]: "8t",
};

const GRID_MOD: Record<GridId, number> = {
	"8": framesPerQNote / 2,
	"16": framesPerQNote / 4,
	"8t": framesPerQNote / 3,
};

function clamp01(x: number): number {
	return Math.max(0, Math.min(1, x));
}

function distToGrid(pos: number, mod: number): number {
	const m = ((pos % mod) + mod) % mod;
	return Math.min(m, mod - m);
}

function softWindowWeight(dist: number, mod: number): number {
	const half = mod / 2;
	return clamp01(1 - dist / half);
}

function getEnabledGrids(param: Param | undefined): GridId[] {
	if (!param) return ["16"];

	const mask = Math.floor(param.value);
	const enabled: GridId[] = [];

	for (const bit in gridMap) {
		const bitNum = Number(bit);
		if ((mask & bitNum) !== 0) enabled.push(gridMap[bitNum]);
	}

	return enabled.length > 0 ? enabled : (["16"] as GridId[]);
}

function gridScore(
	melody: Note[],
	mod: number,
	optimumFraction: number,
): number {
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

	// Soft-windowed average distance (no velocity)
	let weightedDistSum = 0;
	let weightSum = 0;

	for (const n of best) {
		const dist = distToGrid(n.position, mod);
		const w = softWindowWeight(dist, mod);

		weightedDistSum += dist * w;
		weightSum += w;
	}

	const avgDist =
		weightSum > 1e-9
			? weightedDistSum / weightSum
			: best.reduce((s, n) => s + distToGrid(n.position, mod), 0) / best.length;

	const onGrid01 = scoreValue(0, avgDist, framesPerQNote / 8);
	return onGrid01 * 2 - 1;
}

export const scoreGridness16th: ScoringsFunction = ({
	melody,
	params,
	voiceSplits,
	voices,
}) => {
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) return null;

	const optimumParam = params.length > 0 ? params[0].value : 0.5;
	const optimum = optimumParam || 1;

	const enabledParam = params[1];
	const enabled = getEnabledGrids(enabledParam);

	let bestScore: number | null = null;

	for (const grid of enabled) {
		const mod = GRID_MOD[grid];
		const s = gridScore(melody, mod, optimum);
		if (bestScore === null || s > bestScore) bestScore = s;
	}

	return bestScore;
};
