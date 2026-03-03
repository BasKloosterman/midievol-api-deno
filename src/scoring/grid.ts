import { framesPerQNote, Note } from "../notes/index.ts";
import { scoreValue } from "./util.ts";
import { Param, ScoringsFunction } from "./index.ts";
import { limitMelody } from "./util.ts";

type GridId = "8" | "16" | "8t" | "5";

const gridMap: Record<number, GridId> = {
	1: "8",
	[1 << 1]: "16",
	[1 << 2]: "8t",
	[1 << 3]: "5",
};

const GRID_MOD: Record<GridId, number> = {
	"8": framesPerQNote / 2,
	"16": framesPerQNote / 4,
	"8t": framesPerQNote / 3,
	"5": framesPerQNote / 5,
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
	scoreMultiple: boolean,
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

	const best = diffs.slice(0, optimumNoteCount)

	const avgDev = best.reduce((acc, cur) => acc + cur.dist, 0) / best.length

	return   ((mod / 2) - avgDev) / (mod / 2)
}

export const scoreGridness16th: ScoringsFunction = ({
	melody,
	params,
	voiceSplits,
	voices,
}) => {
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) return null;

	const optimum = params.length > 0 ? params[0].value : 0.5;

	const enabledParam = params[1];
	const enabledGrids = getEnabledGrids(enabledParam);

	// when score multiple enabled (> 0), score on all enabled grids at the same time 
	const scoreMultiple = params[2] ? params[2].value > 0 : false;

	let bestScore: number | null = null;
	let bestMode : GridId = "16";

	for (const grid of enabledGrids) {
		const mod = GRID_MOD[grid];
		const s = gridScore(melody, mod, scoreMultiple, optimum);
		if (bestScore === null || s > bestScore) {
			bestScore = s;
			bestMode = grid
		}
	}

	return {score: bestScore, info: [{name: "type", value: bestMode}]};
};
