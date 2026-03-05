import { framesPerQNote, Note } from "../notes/index.ts";
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


function distToGrid(pos: number, mod: number): number {
	const m = ((pos % mod) + mod) % mod;
	return Math.min(m, mod - m);
}

function distToAnyEnabledGrid(pos: number, mods: number[]): number {
	let best = Infinity;
	for (const mod of mods) {
		const d = distToGrid(pos, mod);
		if (d < best) best = d;
	}
	return best;
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
  humanize: number,          // was: optimumFraction
  enabledMods: number[] = [],
): number {
  const diffs = melody.map((note) => {
    const dist = scoreMultiple
      ? distToAnyEnabledGrid(note.position, enabledMods)
      : distToGrid(note.position, mod);
    return dist;
  });

  // ✅ multi-grid strenger maken: referentie is fijnste enabled grid
  const refMod = scoreMultiple ? Math.min(...enabledMods) : mod;

  // humanize 0..1  ->  free deviation 0..(20% van refMod)
  const h = Math.max(0, Math.min(1, humanize));
  const maxFreeFrac = 0.20;
  const freeDev = h * (refMod * maxFreeFrac);

  // score altijd over alle noten: alleen straf buiten tolerance
  const avgDev =
    diffs.reduce((acc, d) => acc + Math.max(0, d - freeDev), 0) / diffs.length;

  // zelfde normalisatie als voorheen
  return ((refMod / 2) - avgDev) / (refMod / 2);
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
	let bestMode: GridId = "16";

	const enabledMods = enabledGrids.map((g) => GRID_MOD[g]);


	for (const grid of enabledGrids) {
	const mod = GRID_MOD[grid];
	const s = gridScore(melody, mod, scoreMultiple, optimum, enabledMods);
	if (bestScore === null || s > bestScore) {
		bestScore = s;
		bestMode = grid;
	}
	}

return { score: bestScore, info: [{ name: "type", value: bestMode }] };

	
};



