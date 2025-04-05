import { framesPerQNote, Note, qNote } from "../notes/index.ts";
import { calcTotalLen, limitMelody } from "./util.ts";
import { ScoringsFunction } from "./index.ts";
import { calcNoteDists } from "./util.ts";

const eighthNote = qNote / 2;

function calcPenalty(lengths: [number, number]): number {
	const dist = lengths[1] - lengths[0];
	return dist >= eighthNote ? 1 - dist * (1 / eighthNote) : 0;
}

function average<T>(items: T[], mapFn: (item: T) => number): number {
	if (items.length === 0) return 0;
	return items.map(mapFn).reduce((sum, val) => sum + val, 0) / items.length;
}

function calculateSegmentDensities(
	notes: Note[],
	totalDuration: number,
	targetDensity: number,
	numSegments: number,
): number {
	const segmentDuration = totalDuration / numSegments;
	const qPerSegment = Math.max(1, segmentDuration / 600);

	const densityScores = Array.from({ length: numSegments }, (_, i) => {
		const start = i * segmentDuration;
		const end = (i + 1) * segmentDuration;
		const count = notes.filter((note) =>
			note.position >= start && note.position < end
		).length;
		const density = count / qPerSegment;
		return -Math.abs(density - targetDensity);
	});

	return average(densityScores, (s) => s);
}

export const scoreAvgNoteDist: ScoringsFunction = ({
	melody,
	voiceSplits,
	voices,
}) => {
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) {
		return null;
	}
	const lengthPairs = melody.slice(0, -1).map((note, i) =>
		[note.length, melody[i + 1].length] as [number, number]
	);
	const avgPenalty = average(lengthPairs, calcPenalty);
	return 1 - (avgPenalty * 2) / eighthNote;
};

export const scoreTotalDist: ScoringsFunction = ({
	melody,
	voiceSplits,
	voices,
}) => {
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) {
		return null;
	}
	return calcTotalLen(melody);
};

export const scoreNormalizedDistanceForMelody: ScoringsFunction = ({
	melody,
	voiceSplits,
	voices,
}) => {
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) {
		return null;
	}
	const dists = calcNoteDists(melody);
	const sixteenthNote = framesPerQNote / 4;
	const halfNote = framesPerQNote * 2;

	const score = dists.reduce((acc, d) => {
		if (d < sixteenthNote) {
			return acc + (1 - (sixteenthNote - d) / sixteenthNote);
		} else if (d > halfNote) {
			return acc + (1 - Math.min((d - halfNote) / halfNote, 1));
		}
		return acc;
	}, 0);

	return -1 + (score / melody.length) * 2;
};

export const _scoreGrowthDensity = ({ melody, density, totalDuration }: {
	melody: Note[];
	density: number;
	totalDuration: number;
}) => {
	let numSegments = Math.ceil(totalDuration / framesPerQNote);

	if (
		totalDuration > framesPerQNote * 8 &&
		totalDuration < framesPerQNote * 16
	) {
		numSegments = Math.ceil(totalDuration / (framesPerQNote * 2));
	} else if (totalDuration > framesPerQNote * 16) {
		numSegments = Math.ceil(totalDuration / (framesPerQNote * 4));
	}

	const targetDensity = density || 1;
	return calculateSegmentDensities(
				melody,
				totalDuration,
				targetDensity,
				Math.max(numSegments, 1),
			) * 2 + 1;
};

export const scoreGrowthDensity: ScoringsFunction = ({
	melody,
	voiceSplits,
	voices,
	params,
}) => {
	const scores: number[] = [];
	const totalDuration = calcTotalLen(melody);

	// Bass
	if (voices[0]) {
		const evolvedMelody = limitMelody(melody, voiceSplits, [
			true,
			false,
			false,
		]);
		scores.push(
			_scoreGrowthDensity({
				melody: evolvedMelody,
				density: params[0].value,
				totalDuration,
			}),
		);
		// console.log('low', params[0].value, evolvedMelody.length, scores.at(-1))
	}

	// Mid
	if (voices[1]) {
		const evolvedMelody = limitMelody(melody, voiceSplits, [
			false,
			true,
			false,
		]);
		scores.push(
			_scoreGrowthDensity({
				melody: evolvedMelody,
				density: params[1].value,
				totalDuration,
			}),
		);
		// console.log('mid', params[1].value, evolvedMelody.length, scores.at(-1))
	}

	// High
	if (voices[2]) {
		const evolvedMelody = limitMelody(melody, voiceSplits, [
			false,
			false,
			true,
		]);
		scores.push(
			_scoreGrowthDensity({
				melody: evolvedMelody,
				density: params[2].value,
				totalDuration,
			}),
		);
		// console.log('high', params[2].value, evolvedMelody.length, scores.at(-1))
	}

	return scores.reduce((acc, cur) => acc + cur) / scores.length;
};
