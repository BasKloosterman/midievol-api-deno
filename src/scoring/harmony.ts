import { Note } from "../notes/index.ts";
import {
	divideInMeasures,
	getMeasures,
	intervalIdx,
	normalizeIntervals,
	THIRD,
} from "./util.ts";
import { ScoringsFunction } from "./index.ts";
import { limitMelody } from "./util.ts";

const allowedChords: Record<string, Set<number>> = {
	majorTriad: new Set([0, 4, 7]),
};

export const scoreMaj7: ScoringsFunction = ({ melody, voiceSplits, voices }) => {
	melody = limitMelody(melody, voiceSplits, voices)
	if (melody.length === 0) {
		return null
	}
	const measures = divideInMeasures(melody).filter((m) => m.length > 1);
	if (measures.length === 0) return -1000;

	const total = measures.reduce((sum, measure) => {
		const root = measure[0];
		const targets = [root.pitch + 40, root.pitch + 70];
		const distances = measure.slice(1).reduce((acc, note) => {
			const minDist = Math.min(
				...targets.map((t) => Math.abs(note.pitch - t)),
			);
			return acc + minDist;
		}, 0);
		return sum + distances / (measure.length - 1);
	}, 0);

	return -(total / measures.length);
};

function getSimultaneousNoteSets(notes: Note[]): Note[][] {
	const sets: Note[][] = [];
	let noteIdx = 0;

	while (noteIdx < notes.length) {
		const curNote = notes[noteIdx];
		const simNotes = [curNote];
		noteIdx++;

		while (
			noteIdx < notes.length &&
			notes[noteIdx].position <= curNote.position + curNote.length
		) {
			simNotes.push(notes[noteIdx]);
			noteIdx++;
		}

		if (simNotes.length > 1) {
			sets.push(simNotes);
		}
	}

	return sets;
}

export const scoreSimultaneousIntervals: ScoringsFunction = ({ melody, voiceSplits, voices }) => {
	melody = limitMelody(melody, voiceSplits, voices)
	if (melody.length === 0) {
		return null
	}
	const sets = getSimultaneousNoteSets(melody);
	const normalizedSets = sets.map((set) =>
		normalizeIntervals(set).map((i) => Math.abs(i![1]))
	);

	if (normalizedSets.length === 0) {
		return 0;
	}

	const targetIntervals = [intervalIdx.get(THIRD.toString())];
	const containing = normalizedSets.map((ns) =>
		ns.filter((i) => targetIntervals.includes(i)).length / ns.length
	);
	const score = -1 +
		(containing.reduce((sum, val) => sum + val, 0) /
				normalizedSets.length) * 2;

	return score;
};

const majorScale = [0, 2, 4, 5, 7, 9, 11];
const harmonicMinorScale = [0, 2, 3, 5, 7, 8, 11];

const keys = [
	...Array.from(
		{ length: 12 },
		(_, i) => new Set(majorScale.map((p) => (p + i) % 12)),
	),
	...Array.from(
		{ length: 12 },
		(_, i) => new Set(harmonicMinorScale.map((p) => (p + i) % 12)),
	),
];

export const scoreInKey: ScoringsFunction = ({ melody, voiceSplits, voices }) => {
	melody = limitMelody(melody, voiceSplits, voices)
	if (melody.length === 0) {
		return null
	}
	const normalizedNotes = melody.map((n) => Math.round(n.pitch / 10) % 12);

	const maxScore = keys.reduce((max, key) => {
		const matches = normalizedNotes.filter((n) => key.has(n)).length;
		const perc = matches / normalizedNotes.length;
		return Math.max(max, perc);
	}, 0);

	return maxScore * 2 - 1;
};

export const scoreMeasureForChord: ScoringsFunction = ({ melody, params, voiceSplits, voices }) => {
	melody = limitMelody(melody, voiceSplits, voices)
	if (melody.length === 0) {
		return null
	}
	const minPitch = params[0]?.value ?? 0;
	const maxPitch = params[1]?.value ?? 127;

	const bars = getMeasures(melody);

	const scores = bars.map((measure) => {
		const best = measure.reduce((maxScore, note) => {
			const pitch = Math.round(note.pitch / 10);
			if (pitch < minPitch || pitch > maxPitch) return maxScore;

			const root = pitch % 12;
			const normalized = measure.map((n) =>
				(Math.round(n.pitch / 10) % 12 - root) % 12
			);
			const total = normalized.length;

			const bestChordScore = Math.max(
				...Object.values(allowedChords).map((chordSet) => {
					const matchCount = normalized.filter((p) =>
						chordSet.has(p)
					).length;
					const similarity = matchCount / total;
					return -Math.abs(similarity - 0.8);
				}),
			);

			return Math.max(maxScore, bestChordScore);
		}, 0);

		return best;
	});

	const score = scores.length > 0
	? scores.reduce((a, b) => a + b, 0) / scores.length
	: 0;

	return score 
};
