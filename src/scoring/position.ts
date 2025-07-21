import { framesPerQNote, Note, qNote } from "../notes/index.ts";
import { calcTotalLen, limitMelody } from "./util.ts";
import { score, ScoringsFunction } from "./index.ts";
import { calcNoteDists } from "./util.ts";
import { maxHeaderSize } from "node:http";

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
		return acc + 1;
	}, 0);

	return ((score / melody.length) * 2) - 1;
};

// scoreOverlap award point for notes that overlap, the more notes overlap with
// at the same time the higher the score.
export const _scoreOverlap = ({
	melody,
	optimum
	
} : {melody: Note[], optimum: number}) => {

	if (melody.length < 2) {
		return 1 - optimum
	}

	optimum = Math.round(optimum)
	const overlapsPerNote : number[] = melody.map(x => 0)
	
	for (const [idx, curNote] of melody.slice(0, melody.length - 1).entries()) {

		const overlappingPitches : number[] = []
		const pitch = Math.round(curNote.pitch / 10)

		const start = curNote.position
		const end = curNote.position + curNote.length

		for (const [innerIdx, otherNote] of melody.slice(idx + 1).entries()) {
			const otherNoteIdx = idx + (innerIdx + 1) 
			
			const overlappingPitch = Math.round(otherNote.pitch / 10)

			if (
				otherNote.position >= start
				&&
				otherNote.position <= end
				&&
				pitch != overlappingPitch
				&&
				!overlappingPitches.includes(overlappingPitch)
			) {
				overlappingPitches.push(overlappingPitch)
				overlapsPerNote[idx] += 1
				overlapsPerNote[otherNoteIdx] += 1
			}
		}
	}

	const penalty = overlapsPerNote.reduce(
		(acc, val) => acc + Math.abs(val - optimum),
		0
	)

	return 1 - (penalty / melody.length)
};

export const scoreOverlap: ScoringsFunction = ({
	melody,
	voiceSplits,
	voices,
	params,
}) => {
	let scores: score[] = [];

	// Bass
	if (voices[0]) {
		const evolvedMelody = limitMelody(melody, voiceSplits, [
			true,
			false,
			false,
		]);
		scores.push(
			_scoreOverlap({
				melody: evolvedMelody,
				optimum: params[0].value,
			}),
		);
	}

	// Mid
	if (voices[1]) {
		const evolvedMelody = limitMelody(melody, voiceSplits, [
			false,
			true,
			false,
		]);
		scores.push(
			_scoreOverlap({
				melody: evolvedMelody,
				optimum: params[1].value,
			}),
		);
	}

	// High
	if (voices[2]) {
		const evolvedMelody = limitMelody(melody, voiceSplits, [
			false,
			false,
			true,
		]);
		scores.push(
			_scoreOverlap({
				melody: evolvedMelody,
				optimum: params[2].value,
			}),
		);
	}

	return scores.reduce((acc, cur) => acc! + cur!, 0)! / scores.length;
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

	return calculateSegmentDensities(
		melody,
		totalDuration,
		density,
		Math.max(numSegments, 1),
	);
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
