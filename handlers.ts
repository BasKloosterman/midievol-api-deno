// evo_server.ts
import {
	combineScores,
	evo,
	normalizeChildren,
	ScoringDefinition,
} from "./evo.ts";
import { melodyToDNA, Note, parseDNA } from "./src/notes/index.ts";
import {
	score,
	scoreGridness16th,
	scoreGrowthDensity,
	scoreMeasureForChord,
	scoreMelodicMotifs,
	scoreNormalizedDistanceForMelody,
	scoreNormalizeMelodic,
	scoreRhythmicMotifs,
	scoreSimultaneousIntervals,
	scoreTonality,
} from "./src/scoring/index.ts";
import { Context } from "jsr:@oak/oak/context";
import { limitMelody } from "./src/scoring/util.ts";
import { scoreNoteCount } from "./src/scoring/normalize.ts";
import { scoreNoteDiversity } from "./src/scoring/enthropy.ts";
import { scoreOverlap } from "./src/scoring/position.ts";

function normalizeMinInfToZero(scores: score[], debug = false): score[] {
	const minScore = -1 * Math.min(...scores.filter((x) => x != null));
	const m = minScore === 0 ? 0 : 1 / minScore;
	return scores.map((score) =>
		score == null ? null : (1 + m * score) * 2 - 1
	);
}

export function normalizeMinOneToOne(scores: score[], debug = false): score[] {
	const min = Math.min(...scores.filter((x) => x != null));
	const max = Math.max(...scores.filter((x) => x != null));
	const diff = max - min;
	const m = diff === 0 ? 1 : 2 / diff;
	return scores.map((score) => score == null ? null : -1 + m * (score - min));
}

export const scoringFunctions: ScoringDefinition[] = [
	{
		fn: scoreMelodicMotifs,
		weight: 0,
		normalizationFn: normalizeMinOneToOne,
		hasNormalizedScore: false,
		params: [],
		voices: [true, true, true],
		splitVoices: false,
		scoreRange: [0, null],
	}, {
		fn: scoreRhythmicMotifs,
		weight: 0,
		normalizationFn: normalizeMinOneToOne,
		hasNormalizedScore: false,
		params: [],
		voices: [true, true, true],
		splitVoices: false,
		scoreRange: [0, null],
	}, {
		fn: scoreOverlap,
		weight: 0,
		normalizationFn: normalizeMinOneToOne,
		hasNormalizedScore: false,
		params: [{
			name: "Target overlap bass",
			range: [0, 8],
			value: 0,
			type: "int",
		}, {
			name: "Target overlap mid",
			range: [0, 8],
			value: 3,
			type: "int",
		}, {
			name: "Target overlap high",
			range: [0, 8],
			value: 0,
			type: "int",
		}],
		voices: [true, true, true],
		splitVoices: false,
		scoreRange: [null, 1],
	}, {
		fn: scoreTonality,
		weight: 0,
		normalizationFn: normalizeMinOneToOne,
		hasNormalizedScore: true,
		params: [],
		voices: [true, true, true],
		splitVoices: false,
		scoreRange: [-1, 1],
	}, {
		fn: scoreSimultaneousIntervals,
		weight: 0,
		normalizationFn: normalizeMinOneToOne,
		hasNormalizedScore: true,
		params: [],
		voices: [true, true, true],
		splitVoices: false,
		scoreRange: [-1, 1],
	}, {
		fn: scoreMeasureForChord,
		weight: 0,
		normalizationFn: normalizeMinOneToOne,
		hasNormalizedScore: true,
		params: [],
		voices: [true, true, true],
		splitVoices: false,
		scoreRange: [-1, 1],
	}, {
		fn: scoreGridness16th,
		weight: 0,
		normalizationFn: normalizeMinOneToOne,
		hasNormalizedScore: true,
		params: [{ name: "Optimum", range: [0, 1], value: 0, type: "float" }],
		voices: [true, true, true],
		splitVoices: false,
		scoreRange: [-1, 1],
	}, {
		fn: scoreNoteCount,
		weight: 0,
		normalizationFn: normalizeMinOneToOne,
		hasNormalizedScore: false,
		params: [{
			name: "Q Note count",
			range: [0, 160],
			value: 8,
			type: "int",
		}],
		voices: [true, true, true],
		splitVoices: false,
		scoreRange: [null, 0],
	}, {
		fn: scoreNoteDiversity,
		weight: 0,
		normalizationFn: normalizeMinOneToOne,
		hasNormalizedScore: true,
		params: [
			{
				name: "Target diversity",
				range: [0, 1],
				value: 1,
				type: "float",
			},
			{
				name: "Note length preference",
				range: [0, 1],
				value: 0.5,
				type: "float",
			},
		],
		voices: [true, true, true],
		splitVoices: false,
		scoreRange: [-1, 1],
	}, {
		fn: scoreGrowthDensity,
		weight: 0,
		normalizationFn: normalizeMinOneToOne,
		hasNormalizedScore: false,
		params: [{
			name: "Target density bass",
			range: [0, 8],
			value: 0.5,
			type: "float",
		}, {
			name: "Target density mid",
			range: [0, 8],
			value: 0.5,
			type: "float",
		}, {
			name: "Target density high",
			range: [0, 8],
			value: 0.5,
			type: "float",
		}],
		voices: [true, true, true],
		splitVoices: false,
		scoreRange: [null, 0],
	}
];

function updateFuncWeights(userMods: any[]): ScoringDefinition[] {
	return userMods.map((mod, i) => {
		const original = scoringFunctions[i];
		return {
			...original,
			weight: mod.weight,
			params: mod.params,
			voices: mod.voices,
			splitVoices: mod.splitVoices
		};
	});
}

export async function getFunctionsHandler(ctx: Context) {
	const response = scoringFunctions.map((f) => ({
		name: f.fn.name,
		weight: f.weight,
		params: f.params,
		voices: f.voices,
		normalizationFunc: f.normalizationFn.name,
		hasNormalizedScore: f.hasNormalizedScore,
		splitVoices: f.splitVoices,
		scoreRange: f.scoreRange
	}));
	ctx.response.body = response;
}

export async function evolveHandler(ctx: Context) {
	const body = await ctx.request.body.json();
	const updatedFuncs = updateFuncWeights(body.modFuncs);
	const voices = body.voices;
	const melody = parseDNA(body.dna).sort((a, b) => a.position - b.position);

	const { melody: evolved, scores: scoresPerFunc, score } = evo(
		melody,
		body.children || 50,
		body.x_gens,
		updatedFuncs,
		voices,
	);

	ctx.response.body = {
		notes: evolved.map((n) => ({ ...n })),
		scores_per_func: scoresPerFunc,
		score,
		dna: melodyToDNA(evolved),
		bpm: 90,
	};
}

export async function initHandler(ctx: Context) {
	const body = await ctx.request.body.json();
	const updatedFuncs = updateFuncWeights(body.modFuncs);
	const voices = body.voices;
	const melody = parseDNA(body.dna).sort((a, b) => a.position - b.position);

	const scores = updatedFuncs.map((s) =>
		s.weight !== 0
			? s.fn({
				melody: limitMelody(melody, voices, s.voices),
				params: s.params,
				voiceSplits: voices,
				voices: s.voices,
				splitVoices: s.splitVoices
			})
			: 0
	);

	const children: { melody: Note[]; scores: score[] }[] = [{
		melody,
		scores,
	}];
	const normalized = normalizeChildren(children, updatedFuncs);
	const [notes, scoresPerFunc, score] = [
		normalized[0].melody,
		normalized[0].scores,
		combineScores(normalized[0].normalizedScores, updatedFuncs),
	];

	ctx.response.body = {
		notes: notes.map((n) => ({ ...n })),
		scores_per_func: scoresPerFunc,
		score,
		dna: melodyToDNA(notes),
		bpm: 90,
	};
}
