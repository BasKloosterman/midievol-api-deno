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
// export { scoreNormalizeMelodic } from "./normalize.ts";
export { scoreNoteDiversity } from "./enthropy.ts";
import { Note } from "../notes/index.ts";

export type ParamType = "note" | "float" | "int" | "bool";
export interface Param {
	name: string;
	value: number;
	range: [number, number];
	type: ParamType;
}

export interface ScoringsFunctionArgs {
	melody: Note[];
	params: Param[];
	voiceSplits: { min: number; max: number };
	voices: [boolean, boolean, boolean];
	splitVoices: boolean;
}

export type score = number | null;

export interface ScoreInfo {
	name: string,
	value: string
}

export interface FuncScore {score: score, info: ScoreInfo[]}

export type ScoringsFunction = (args: ScoringsFunctionArgs) => FuncScore | null;
