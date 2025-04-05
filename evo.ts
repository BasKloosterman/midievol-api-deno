// evo.ts

import { Note } from "./src/notes/index.ts";
import { Param, score, ScoringsFunction } from "./src/scoring/index.ts";
import { sumBy } from "./util.ts";
export interface ScoringDefinition {
	fn: ScoringsFunction;
	weight: number;
	normalizationFn: (scores: score[], debug?: boolean) => score[];
	params: Param[];
	voices: [boolean, boolean, boolean];
}

export function clamp(n: number, minVal: number, maxVal: number): number {
	return Math.min(maxVal, Math.max(minVal, n));
}

export function randAdd(
	cur: number,
	maxDeviation: number,
	steepness: number,
): number {
	const rangeDiff = Math.random() <= 0.5 ? maxDeviation : -maxDeviation;
	const delta = Math.round(Math.pow(Math.random(), steepness) * rangeDiff);
	return cur + delta;
}

export function normalizeChildren(
	children: { melody: Note[]; scores: score[] }[],
	scoreFuncs: ScoringDefinition[],
) {
	const scoresByFunc = children.map((child) => child.scores);
	const transposed = scoresByFunc[0].map((_, i: number) =>
		scoresByFunc.map((row) => row[i])
	);

	const normalizedScoresByFunc = transposed.map((s: score[], idx: number) =>
		scoreFuncs[idx].normalizationFn(s, idx === 5)
	);
	const normalizedScoresByChild = normalizedScoresByFunc[0].map(
		(_, i: number) => normalizedScoresByFunc.map((row) => row[i]),
	);

	const newChildren: {
		melody: Note[];
		scores: score[];
		normalizedScores: score[];
	}[] = children.map((child, idx) => {
		return { ...child, normalizedScores: normalizedScoresByChild[idx] };
	});

	return newChildren;
}

const probSmallMutation = 0.7;
const probMediumMutation = 0.2;
const probLargeMutation = 0.1;

const maxReach = 840;
const framesPerQNote = 600;
const maxNoteLength = framesPerQNote * 4;
const maxVolume = 127;
const maxSongLength = framesPerQNote * 64;

type mutSize = "small" | "medium" | "large";

const getMutSize = (): mutSize => {
	const roll = Math.random();

	if (roll < probSmallMutation) {
		return "small";
	}
	if (roll < probSmallMutation + probMediumMutation) {
		return "medium";
	}

	return "large";
};

// Determines how much a note evolution can change
// the different props of a note
const deviationSet = (mutSize: mutSize) => {
	if (mutSize === "small") {
		return {
			pitchDev: 30,
			lengthDev: framesPerQNote,
			volDev: 30,
			posDev: framesPerQNote,
		};
	}
	if (mutSize === "medium") {
		return {
			pitchDev: 70,
			lengthDev: framesPerQNote * 2,
			volDev: 60,
			posDev: framesPerQNote * 2,
		};
	}
	return {
		pitchDev: 120,
		lengthDev: framesPerQNote * 4,
		volDev: 127,
		posDev: framesPerQNote * 4,
	};
};

function evoNote(note: Note, mutSize: mutSize): Note {
	const newNote = note.copy();

	const { pitchDev, lengthDev, volDev, posDev } = deviationSet(mutSize);

	newNote.pitch = clamp(randAdd(note.pitch, pitchDev, 4), 0, maxReach);
	newNote.length = clamp(
		randAdd(note.length, lengthDev, 4),
		75,
		maxNoteLength,
	);
	newNote.volume = clamp(randAdd(note.volume, volDev, 4), 0, maxVolume);
	newNote.position = clamp(
		randAdd(note.position, posDev, 4),
		0,
		maxSongLength,
	);

	return newNote;
}

function evoChild(melody: Note[], mutSize: mutSize): Note[] {
	let nEvos = 0;
	const child: Note[] = [];

	for (const note of melody) {
		const mutChance = Math.random();
		let mutate = false;

		if (mutSize === "small") {
			mutate = mutChance <= 0.1;
		} else if (mutSize === "medium") {
			mutate = mutChance <= 0.2;
		} else {
			mutate = mutChance <= 0.4;
		}

		if (mutate) {
			child.push(evoNote(note, mutSize));
			nEvos++;
		} else {
			child.push(note.copy());
		}
	}

	return nEvos > 0 ? child : evoChild(melody, mutSize);
}

function accordingToMutSize(
	mutSize: mutSize,
	small = 0.01,
	medium = 0.03,
	large = 0.05,
): boolean {
	const roll = Math.random();
	if (mutSize === "small") {
		return roll < small;
	}

	if (mutSize === "medium") {
		return roll < medium;
	}

	return roll < large;
}

function grabNoteSet(
	melody: Note[],
	mutSize: mutSize,
	size?: number,
): [number, number] {
	let numNotes: number;

	if (size === undefined) {
		const len = melody.length;
		let notesPerc: number;

		if (mutSize === "small") {
			notesPerc = Math.random() * 0.1;
		} else if (mutSize === "medium") {
			notesPerc = Math.random() * 0.15 + 0.05;
		} else {
			notesPerc = Math.random() * 0.2 + 0.1;
		}

		numNotes = Math.ceil(notesPerc * len);
	} else {
		numNotes = size;
	}

	const pos = Math.round(Math.random() * (melody.length - 1));
	return [pos, Math.min(pos + numNotes, melody.length)];
}

function duplicateNotes(melody: Note[], mutSize: mutSize): Note[] {
	const [start, stop] = grabNoteSet(melody, mutSize);
	const notes = melody.slice(start, stop);
	const lastNote = melody[melody.length - 1];
	const offset = lastNote.position + lastNote.length;

	for (const n of notes) {
		const nn = n.copy();
		nn.position += offset;
		melody.push(nn);
	}

	return melody;
}

function removeNotes(melody: Note[], mutSize: mutSize): Note[] {
	const [start, stop] = grabNoteSet(melody, mutSize);
	melody.splice(start, stop - start);
	return melody;
}

function reversePitches(melody: Note[], mutSize: mutSize): void {
	const [start, stop] = grabNoteSet(melody, mutSize);
	const notes = melody.slice(start, stop);
	if (notes.length < 2) return;

	const pitches = notes.map((n) => n.pitch);
	const min = Math.min(...pitches);
	const max = Math.max(...pitches);

	notes.forEach((n) => (n.pitch = max - (n.pitch - min)));
}

function reverseNotes(melody: Note[], mutSize: mutSize): void {
	const [start, stop] = grabNoteSet(melody, mutSize);
	const notes = melody.slice(start, stop);
	if (notes.length < 2) return;

	for (let i = 0; i < Math.floor(notes.length / 2); i++) {
		const j = notes.length - 1 - i;
		[notes[i].position, notes[j].position] = [
			notes[j].position,
			notes[i].position,
		];
	}
}

export function combineScores(
	scores: score[],
	scoreDefs: ScoringDefinition[],
): number {
	const total = sumBy(scoreDefs, (s) => s.weight);
	if (total === 0) {
		return 0;
	}

	const result = scores
		.filter((x) => x != null)
		.reduce((sum, score, idx) => {
			const { weight } = scoreDefs[idx];
			if (weight === 0) {
				return sum;
			}
			const adjusted = weight < 0 ? 2 - (1 + score) : 1 + score;
			return sum + adjusted * Math.abs(weight / total);
		}, 0);

	return -1 + result;
}

export function evo(
	melody: Note[],
	nChildren: number,
	nGens: number,
	scoreDefs: ScoringDefinition[],
	voiceSplits: { min: number; max: number },
) {
	if (melody.length === 0) {
		throw new Error("Cannot evolve empty melody");
	}

	let nMelody = melody;
	let nScoreList: score[] = [];
	let nScore: score = 0;

	for (let gen = 0; gen < nGens; gen++) {
		const children: { melody: Note[]; scores: score[] }[] = [];

		// First add self to compare to original later
		const scores = scoreDefs.map((def) =>
			def.weight !== 0
				? def.fn({
					melody,
					params: def.params,
					voiceSplits,
					voices: def.voices,
				})
				: 0
		);
		children.push({ melody: nMelody.slice(), scores });

		// console.log('parent', children)

		const mutSize = getMutSize();

		for (let i = 0; i < nChildren; i++) {
			let evolved: Note[] = [];

			// Duplicate random note
			if (accordingToMutSize(mutSize)) {
				evolved.push(
					nMelody[Math.floor(Math.random() * nMelody.length)],
				);
			}

			evolved = evoChild(evolved.concat(nMelody), mutSize);

			// Remove random note
			if (accordingToMutSize(mutSize) && evolved.length > 4) {
				evolved.splice(Math.floor(Math.random() * evolved.length), 1);
			}
			// swap a couple of notes in place
			if (accordingToMutSize(mutSize)) {
				reverseNotes(evolved, mutSize);
			}

			evolved.sort((a, b) => a.position - b.position);

			if (accordingToMutSize(mutSize)) {
				evolved = duplicateNotes(evolved, mutSize);
			}
			if (accordingToMutSize(mutSize)) {
				evolved = removeNotes(evolved, mutSize);
			}
			// swap a couple of pitches in place
			if (accordingToMutSize(mutSize)) {
				reversePitches(evolved, mutSize);
			}

			const evolvedScores = scoreDefs.map((def) =>
				def.weight !== 0
					? def.fn({
						melody: evolved,
						params: def.params,
						voiceSplits,
						voices: def.voices,
					})
					: 0
			);

			children.push({ melody: evolved.slice(), scores: evolvedScores });
		}

		// console.log('children', children)

		const normalizedChildren = normalizeChildren(children, scoreDefs);

		// console.log('normalizedChildren', normalizedChildren)

		const scoredChildren = normalizedChildren.map(
			({ melody, scores, normalizedScores }) => ({
				melody,
				scores,
				normalizedScores,
				combinedScore: combineScores(normalizedScores, scoreDefs),
			}),
		);

		const maxScore = Math.max(
			...scoredChildren.map((c) => c.combinedScore).filter((x) =>
				x != null
			),
		);
		const maxScoredChildren = scoredChildren.filter(
			(c) => c.combinedScore === maxScore,
		);

		const idx = Math.floor(Math.random() * maxScoredChildren.length);

		const ret = maxScoredChildren[idx];

		nMelody = ret.melody;
		nScoreList = ret.scores;
		nScore = ret.combinedScore;
	}

	return { melody: nMelody, scores: nScoreList, score: nScore };
}
