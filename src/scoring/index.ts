export { scoreGridness16th } from "./grid.ts";
export {
	scoreAvgNoteDist,
	scoreGrowthDensity,
	scoreNormalizedDistanceForMelody,
	scoreTotalDist,
} from "./position.ts";
export {
	scoreInKey,
	scoreMaj7,
	scoreMeasureForChord,
	scoreSimultaneousIntervals,
} from "./harmony.ts";
export { scoreMelodicMotifs, scoreRhythmicMotifs } from "./motifs.ts";
export { scoreTonality } from "./tonality.ts";
export { scoreNormalizeMelodic } from "./normalize.ts";
import { Note } from "../notes/index.ts";

export type ParamType = "note" | "float";
export interface Param {
	name: string;
	value: number;
	range: [number, number];
	type: ParamType;
}

interface ScoringsFunctionArgs {
	melody: Note[];
	params: Param[];
	voiceSplits: {min: number, max: number};
	voices: [boolean, boolean, boolean];
}

export type score = number | null

export type ScoringsFunction = (args: ScoringsFunctionArgs) => score;
