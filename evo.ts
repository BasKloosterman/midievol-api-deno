// evo.ts


import { maybeMutateBpm } from "./bpm.ts";
import { Note, qNote } from "./src/notes/index.ts";
import { FuncScore, Param, score, ScoreInfo, ScoringsFunction } from "./src/scoring/index.ts";
import { applySplitVoices, calcTotalLen } from "./src/scoring/util.ts";
import { sumBy } from "./util.ts";
export interface ScoringDefinition {
	fn: ScoringsFunction;
	weight: number;
	normalizationFn: (scores: (FuncScore | null)[], debug?: boolean) => (FuncScore | null)[];
	// Indicates that the score is normalized between -1 and 1
	hasNormalizedScore: boolean;
	params: Param[];
	voices: [boolean, boolean, boolean];
	splitVoices: boolean;
	scoreRange: [score, score];
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
	children: { melody: Note[]; scores: (FuncScore | null)[], bpm: number }[],
	scoreFuncs: ScoringDefinition[],
) {
	const scoresByFunc = children.map((child) => child.scores);
	const transposed = scoresByFunc[0].map((_, i: number) =>
		scoresByFunc.map((row) => row[i])
	);

	const normalizedScoresByFunc = transposed.map((s: (FuncScore | null)[], idx: number) =>
		scoreFuncs[idx].normalizationFn(s)
	);

	const normalizedScoresByChild = normalizedScoresByFunc[0].map(
		(_, i: number) => normalizedScoresByFunc.map((row) => row[i]),
	);

	const newChildren: {
		melody: Note[];
		scores: (FuncScore | null)[];
		normalizedScores: (FuncScore | null)[];
		bpm: number;
	}[] = children.map((child, idx) => {
		return { ...child, normalizedScores: normalizedScoresByChild[idx] };
	});

	return newChildren;
}

const probSmallMutation = 0.8;
const probMediumMutation = 0.15;
const probLargeMutation = 0.05;

const maxReach = 840;
const framesPerQNote = 600;
const maxNoteLength = framesPerQNote * 4;
const maxVolume = 127;
const maxSongLength = framesPerQNote * 64;

export type MutSize = "small" | "medium" | "large";

export const getMutSize = (): MutSize => {
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
const deviationSet = (mutSize: MutSize) => {
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

// ✅ ADDED: rare register jump (octave / 2-octave)
function maybeRegisterJump(note: Note, mutSize: MutSize) {
	const chance =
	  mutSize === "small" ? 0.005 :
	  mutSize === "medium" ? 0.015 :
	  0.04;
  
	if (Math.random() > chance) return;
  
	// In jouw pitch-schaal lijkt 1 octaaf = 120 (12 semitones * 10)
	const oneOct = 120;
	const twoOct = 240;
  
	const jump = Math.random() < 0.8 ? oneOct : twoOct; // 80/20
	const dir = Math.random() < 0.5 ? -1 : 1;
  
	note.pitch = clamp(note.pitch + dir * jump, 0, maxReach);
}
  

function evoNote(note: Note, mutSize: MutSize): Note {
	const newNote = note.copy();

	const { pitchDev, lengthDev, volDev, posDev } = deviationSet(mutSize);

	newNote.pitch = clamp(randAdd(note.pitch, pitchDev, 4), 0, maxReach);
	newNote.length =  Math.max(randAdd(note.length, lengthDev, 4), 75);
	newNote.volume = clamp(randAdd(note.volume, volDev, 4), 0, maxVolume);
	newNote.position = Math.max(randAdd(note.position, posDev, 4), 0)

	maybeRegisterJump(newNote, mutSize);

	return newNote;
}


  
function randInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function spawnNote(
	maxPos: number,
): Note {
	const t = new Note()
  
	t.pitch = randInt(0, maxReach);
	t.length = randInt(0, maxNoteLength)
	t.volume = randInt(0, maxVolume)
	t.position = randInt(0, maxPos)
  
	return t;
}  

function evoChild(
	melody: Note[],
	mutSize: MutSize,
	singleMutation: boolean,
	small = 0.02,
	medium = 0.1,
	large = 0.3
): Note[] {
	const child: Note[] = [];
	let forcedIndex = -1;

	if (singleMutation && melody.length > 0) {
	forcedIndex = Math.floor(Math.random() * melody.length);
}

	for (let i = 0; i < melody.length; i++) {
	const note = melody[i];

	let mutate = false;

	if (singleMutation) {
		// EXACT 1 noot mag muteren
		mutate = i === forcedIndex;

	} else {

		// huidig probabilistisch gedrag
		const mutChance = Math.random();

		if (mutSize === "small") {
			mutate = mutChance <= small;
		} else if (mutSize === "medium") {
			mutate = mutChance <= medium;
		} else {
			mutate = mutChance <= large;
		}
	}

	if (mutate) {
		child.push(evoNote(note, mutSize));
	} else {
		child.push(note.copy());
	}
}

	return child;
}

function accordingToMutSize(
	mutSize: MutSize,
	small = 0.001,
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

function pickMacroMut(mutSize: MutSize)  {
	const ret = {
		duplicateRandomNote: false,
		removeRandomNote: false,
		reverseNotes: false,
		duplicateNotes: false,
		removeNotes: false,
		reversePitches: false,
		spawnNote: false
	}
	if (!accordingToMutSize(mutSize)) {
		return ret
	}

	const retKeys = Object.keys(ret);

	(ret as any)[retKeys[Math.floor(Math.random() * retKeys.length)]] = true

	return ret
}

function grabNoteSet(
	melody: Note[],
	mutSize: MutSize,
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

export function insertTimePeriod(melody: Note[], mutSize: MutSize): Note[] {
	const [start, stop] = grabNoteSet(melody, mutSize);
	const notes = melody.slice(start, stop);

	if (notes.length === 0) return melody;

	const timeOffset = notes.at(-1)!.position + notes.at(-1)!.length - notes[0].position;

	// Shift all notes after `notes[stop - 1]`
	for (let i = stop; i < melody.length; i++) {
		melody[i].position += timeOffset;
	}

	// Duplicate notes and insert at the same location
	const duplicated = notes.map(n => {
		const nn = n.copy();
		nn.position += 0; // keep same relative position
		return nn;
	});

	melody.splice(stop, 0, ...duplicated);

	return melody;
}


export function duplicateNotes(melody: Note[], mutSize: MutSize): Note[] {
	const [start, stop] = grabNoteSet(melody, mutSize);
	const notes = melody.slice(start, stop);
	const lastNote = melody.at(-1);
	if (!lastNote) {
		return melody
	}
	let offset = Math.round((lastNote.position + lastNote.length) * Math.random());

	offset  = offset - notes.at(0)?.position!
	for (const n of notes) {
		const nn = n.copy();
		nn.position += offset;
		melody.push(nn);
	}

	return melody
}

export function deleteTimePeriod(melody: Note[], mutSize: MutSize): Note[] {
	const [start, stop] = grabNoteSet(melody, mutSize);
	if (start >= melody.length) return melody;

	const notesToRemove = melody.slice(start, stop);
	if (notesToRemove.length === 0) return melody;

	const timeOffset = notesToRemove.at(-1)!.position + notesToRemove.at(-1)!.length - notesToRemove[0].position;

	// Remove the notes
	melody.splice(start, stop - start);

	// Shift all notes after `stop` back in time
	for (let i = start; i < melody.length; i++) {
		melody[i].position -= timeOffset;
	}

	return melody;
}


export function removeNotes(melody: Note[], mutSize: MutSize): Note[] {
	const [start, stop] = grabNoteSet(melody, mutSize);
	melody.splice(start, stop - start);
	return melody;
}

function reversePitches(melody: Note[], mutSize: MutSize): boolean {
	const [start, stop] = grabNoteSet(melody, mutSize);
	const notes = melody.slice(start, stop);
	if (notes.length < 2) {
		return false
	}

	const pitches = notes.map((n) => n.pitch);
	const min = Math.min(...pitches);
	const max = Math.max(...pitches);

	notes.forEach((n) => (n.pitch = max - (n.pitch - min)));

	return true
}

function reverseNotes(melody: Note[], mutSize: MutSize) {
	const [start, stop] = grabNoteSet(melody, mutSize);
	const notes = melody.slice(start, stop);
	if (notes.length < 2) {
		return
	}

	for (let i = 0; i < Math.floor(notes.length / 2); i++) {
		const j = notes.length - 1 - i;
		[notes[i].position, notes[j].position] = [
			notes[j].position,
			notes[i].position,
		];
	}
}

export function combineScores(
	scores: (FuncScore | null)[],
	scoreDefs: ScoringDefinition[],
): number {
	const total = sumBy(scoreDefs, (s) => Math.abs(s.weight));
	if (total === 0) {
		return 0;
	}

	const result = scores
		.reduce((sum : number, score, idx) => {
			if (score === null || score.score === null) {
				return sum;
			}

			const { weight } = scoreDefs[idx];

			if (weight === 0) {
				return sum;
			}
			
			const adjusted = weight < 0 ? 2 - (1 + score.score) : 1 + score.score;

			return sum + adjusted * (Math.abs(weight) / total);
		}, 0);

	return -1 + result;
}

export function evo(
	melody: Note[],
	nChildren: number,
	nGens: number,
	scoreDefs: ScoringDefinition[],
	voiceSplits: { min: number; max: number },
	bpm: number
) {
	if (melody.length === 0) {
		throw new Error("Cannot evolve empty melody");
	}

	let nMelody = melody;
	let nScoreList: (FuncScore | null)[] = [];
	let nScore: score = 0;
	let nBpm: number = bpm

	for (let gen = 0; gen < nGens; gen++) {
		const children: { melody: Note[]; scores: (FuncScore | null)[]; bpm: number }[] = [];
		// First add self to compare to original later
		// First add current parent ("self") so normalization compares against current organism
        const scores = scoreDefs.map((def) =>
         def.weight !== 0
       ? applySplitVoices(def.fn, {
        melody: nMelody,
        params: def.params,
        voiceSplits,
        voices: def.voices,
        splitVoices: def.splitVoices,
        bpm: nBpm,
      })
    : null
);

children.push({ melody: nMelody.slice(), scores, bpm: nBpm });

		
		for (let i = 0; i < nChildren; i++) {
			const mutSize = getMutSize();
			const singleMutation = Math.random() < 0.5;   // ← nieuw probeersel! de helft van de kids mag maar 1 mutatie
			const macroMut = pickMacroMut(mutSize)
			let evolved: Note[] = [];
			let childBpm = nBpm;


			

			// Duplicate random note
			if (macroMut.duplicateRandomNote) {
				evolved.push(
					nMelody[Math.floor(Math.random() * nMelody.length)],
				);
			}

			if (macroMut.spawnNote) {
    		const newNote = spawnNote(calcTotalLen(evolved) + 1 * qNote);
    		evolved.push(newNote);
			}

			evolved = evoChild(evolved.concat(nMelody), mutSize, singleMutation);
			childBpm = maybeMutateBpm(nBpm, mutSize)

			// swap a couple of notes in place
			if (macroMut.reverseNotes) {
				reverseNotes(evolved, mutSize);
			}

			// Remove random note
			if (macroMut.removeRandomNote && evolved.length > 1) {
				evolved.splice(Math.floor(Math.random() * evolved.length), 1);
			}

			if (macroMut.duplicateNotes) {
				evolved.sort((a, b) => a.position - b.position);
				evolved = duplicateNotes(evolved, mutSize);
			}

			if (macroMut.removeNotes) {
				evolved.sort((a, b) => a.position - b.position);
				evolved = removeNotes(evolved, mutSize);
			}

			if (!evolved.length) {
				continue
			}

			// swap a couple of pitches in place
			if (macroMut.reversePitches) {
				reversePitches(evolved, mutSize);
			}

			evolved.sort((a, b) => a.position - b.position);

			const evolvedScores = scoreDefs.map((def) =>
				def.weight !== 0
					? applySplitVoices(def.fn, {
						melody: evolved,
						params: def.params,
						voiceSplits,
						voices: def.voices,
						splitVoices: def.splitVoices,
						bpm: childBpm
					})
					: null
			);

			children.push({ melody: evolved.slice(), scores: evolvedScores, bpm: childBpm });
		}


		const normalizedChildren = normalizeChildren(children, scoreDefs);

		
		const scoredChildren = normalizedChildren.map(
			({ melody, scores, normalizedScores, bpm }) => ({
				melody,
				scores,
				normalizedScores,
				combinedScore: combineScores(normalizedScores, scoreDefs),
				bpm
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

		const bestChild = maxScoredChildren[idx];

		if (bestChild) {
			nMelody = bestChild.melody;
			nScoreList = bestChild.scores; 
			nScore = bestChild.combinedScore;
			nBpm = bestChild.bpm;
		}

		
	}

	return { melody: nMelody, scores: nScoreList, score: nScore, bpm: nBpm };
}
