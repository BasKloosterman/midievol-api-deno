import { framesPerQNote, Note } from "../notes/index.ts";

export function scoreValue(
	optimalValue: number,
	actualValue: number,
	maxDeviation: number,
	maxScore = 1,
	falloff = 1,
): number {
	const actualMaxScore = Math.pow(maxScore, 1 / falloff);
	const scaling = actualMaxScore / maxScore;
	const actualMaxDeviation = scaling * maxDeviation;

	const score = Math.pow(
		actualMaxScore -
			(actualMaxScore / actualMaxDeviation) *
				Math.abs((actualValue - optimalValue) * scaling),
		falloff,
	);

	return Math.max(0, Math.min(score, maxScore));
}

function createScoreValue(
	maxDeviation: number,
	maxScore = 1,
	falloff = 1,
): (optimalValue: number, actualValue: number) => number {
	const actualMaxScore = Math.pow(maxScore, 1 / falloff);
	const scaling = actualMaxScore / maxScore;
	const actualMaxDeviation = scaling * maxDeviation;

	return (optimalValue: number, actualValue: number) =>
		partialScoreValue(
			actualMaxScore,
			scaling,
			actualMaxDeviation,
			falloff,
			maxScore,
			optimalValue,
			actualValue,
		);
}

function partialScoreValue(
	actualMaxScore: number,
	scaling: number,
	actualMaxDeviation: number,
	falloff: number,
	maxScore: number,
	optimalValue: number,
	actualValue: number,
): number {
	const score = Math.pow(
		actualMaxScore -
			(actualMaxScore / actualMaxDeviation) *
				Math.abs((actualValue - optimalValue) * scaling),
		falloff,
	);

	return Math.max(0, Math.min(score, maxScore));
}

// Util scoring functions
const scorePos = createScoreValue(1 << 20, 1, 500);
const scorePitch = createScoreValue(840, 1, 1);

function detectMeasure(note: Note, beatsPerMeasure = 4): number {
	return Math.floor(note.position / (beatsPerMeasure * framesPerQNote));
}

export function divideInMeasures(notes: Note[], beatsPerMeasure = 4): Note[][] {
	const measures: Record<number, Note[]> = {};

	for (const note of notes) {
		const curNoteMeasure = detectMeasure(note, beatsPerMeasure);
		if (!measures[curNoteMeasure]) measures[curNoteMeasure] = [];
		measures[curNoteMeasure].push(note);
	}

	const maxIdx = Math.max(...Object.keys(measures).map(Number));
	const measureList: Note[][] = [];

	for (let idx = 0; idx <= maxIdx; idx++) {
		measureList.push(measures[idx] || []);
	}

	return measureList;
}

export function calcNoteDists(melody: Note[]): number[] {
	const positions = melody.map((n) => n.position);
	return positions.slice(1).map((pos, i) => pos - positions[i]);
}

export const PRIME = [0];
export const SECOND = [1, 2];
export const THIRD = [3, 4];
export const FOURTH = [5, 6];
export const FIFTH = [7];
export const SIXTH = [8, 9];
export const SEVENTH = [10, 11];

export const intervals = [
	PRIME,
	SECOND,
	THIRD,
	FOURTH,
	FIFTH,
	SIXTH,
	SEVENTH,
];

export const intervalIdx = new Map(
	intervals.map((group, idx) => [group.toString(), idx]),
);

function calculateIntervals(melody: Note[]): number[] {
	const pitches = melody.map((n) => Math.round(n.pitch / 10));
	return pitches.slice(1).map((p, i) => p - pitches[i]);
}

function mapInterval(i: number): [number, number] | undefined {
	for (let idx = 0; idx < intervals.length; idx++) {
		const intv = intervals[idx];
		if (intv.includes(Math.abs(i % 12))) {
			return [Math.floor(i / 12), i < 0 ? -idx : idx];
		}
	}
}

export function normalizeIntervals(
	notes: Note[],
): ([number, number] | undefined)[] {
	const rawIntervals = calculateIntervals(notes);
	return rawIntervals.map(mapInterval);
}

export function calcTotalLen(notes: Note[]): number {
	if (notes.length < 2) return notes[0]?.length || 0;
	return (
		notes[notes.length - 1].position -
		notes[0].position +
		notes[notes.length - 1].length
	);
}

export function getMeasures(notes: Note[]): Note[][] {
	const barDuration = framesPerQNote * 4;
	const barsCount = Math.ceil(calcTotalLen(notes) / barDuration);
	const bars: Note[][] = [];

	for (let i = 0; i < barsCount; i++) {
		const start = i * barDuration;
		const end = (i + 1) * barDuration;
		bars.push(
			notes.filter((note) =>
				note.position >= start && note.position < end
			),
		);
	}

	return bars;
}

export function rotate<T>(arr: T[], n: number): T[] {
	const len = arr.length;
	const offset = ((n % len) + len) % len;
	return [...arr.slice(offset), ...arr.slice(0, offset)];
}

export function pearsonCorr(a: number[], b: number[]): number {
	const n = a.length;
	const meanA = a.reduce((sum, v) => sum + v, 0) / n;
	const meanB = b.reduce((sum, v) => sum + v, 0) / n;

	let numerator = 0;
	let denomA = 0;
	let denomB = 0;

	for (let i = 0; i < n; i++) {
		const diffA = a[i] - meanA;
		const diffB = b[i] - meanB;
		numerator += diffA * diffB;
		denomA += diffA ** 2;
		denomB += diffB ** 2;
	}

	return numerator / Math.sqrt(denomA * denomB);
}

export function limitMelody(
	melody: Note[],
	voicesSplits: {min: number, max: number},
	voices: [boolean, boolean, boolean],
): Note[] {
	let min_ = 0;
	let max_ = 84;

	if (!voices.includes(true)) {
		return [];
	}
	if (voices[0]) {
		min_ = 0;
	} else if (voices[1]) {
		min_ = voicesSplits.min;
	} else if (voices[2]) {
		min_ = voicesSplits.max;
	}

	if (voices[2]) {
		max_ = 84;
	} else if (voices[1]) {
		max_ = voicesSplits.max - 1;
	} else if (voices[0]) {
		max_ = voicesSplits.min - 1;
	}

	min_ *= 10;
	max_ *= 10;

	return melody.filter((note) => note.pitch >= min_ && note.pitch <= max_);
}