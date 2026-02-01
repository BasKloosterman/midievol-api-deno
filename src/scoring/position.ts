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

// export const _scoreOverlap = ({
// 	melody,
// 	optimum,
//   }: {
// 	melody: Note[];
// 	optimum: number;
//   }) => {
// 	const n = melody.length;
// 	if (n < 2) return 1 - optimum;
  
// 	optimum = Math.round(optimum);
  
// 	// Ensure time order (your pipeline often sorts already, but this makes it safe)
// 	// If you're 100% sure melody is sorted, you can remove this for extra speed.
// 	// const notes = melody.slice().sort((a, b) => a.position - b.position);
  
// 	// Precompute pitch buckets and end times
// 	const pitchBucket = new Int16Array(n);
// 	const endTime = new Int32Array(n);
// 	for (let i = 0; i < n; i++) {
// 	  pitchBucket[i] = Math.round(melody[i].pitch / 10);
// 	  endTime[i] = melody[i].position + melody[i].length;
// 	}
  
// 	// Overlaps counted per note (in the sorted 'notes' order)
// 	const overlapsPerNote = new Int16Array(n);
  
// 	// Bitset per note: tracks which pitch buckets have already been counted as overlaps.
// 	// Buckets are ~0..84 with your maxReach=840 => 85 buckets, so 3x 32-bit = 96 bits is enough.
// 	const mask0 = new Uint32Array(n);
// 	const mask1 = new Uint32Array(n);
// 	const mask2 = new Uint32Array(n);
  
// 	function hasBit(i: number, b: number): boolean {
// 	  if (b < 0) return false;
// 	  if (b < 32) return ((mask0[i] >>> b) & 1) !== 0;
// 	  if (b < 64) return ((mask1[i] >>> (b - 32)) & 1) !== 0;
// 	  if (b < 96) return ((mask2[i] >>> (b - 64)) & 1) !== 0;
// 	  return true; // out of range: treat as already seen
// 	}
  
// 	function setBit(i: number, b: number): void {
// 	  if (b < 0) return;
// 	  if (b < 32) mask0[i] |= 1 << b;
// 	  else if (b < 64) mask1[i] |= 1 << (b - 32);
// 	  else if (b < 96) mask2[i] |= 1 << (b - 64);
// 	}
  
// 	// Active notes are indices into 'notes' that overlap current time
// 	let active: number[] = [];
  
// 	for (let cur = 0; cur < n; cur++) {
// 	  const curStart = melody[cur].position;
// 	  const curPitch = pitchBucket[cur];
  
// 	  // Drop notes that have ended
// 	  if (active.length) {
// 		const nextActive: number[] = [];
// 		for (let k = 0; k < active.length; k++) {
// 		  const idx = active[k];
// 		  if (endTime[idx] > curStart) nextActive.push(idx);
// 		}
// 		active = nextActive;
// 	  }
  
// 	  // Compare current note to active notes (these are the only possible overlaps)
// 	  for (let k = 0; k < active.length; k++) {
// 		const prev = active[k];
  
// 		// Pitch bucket must differ (same rule as your original)
// 		if (pitchBucket[prev] === curPitch) continue;
  
// 		// This matches your "unique per prev-note" behavior:
// 		// if prev already counted an overlap with this pitch bucket, skip.
// 		if (hasBit(prev, curPitch)) continue;
  
// 		setBit(prev, curPitch);
// 		overlapsPerNote[prev] += 1;
// 		overlapsPerNote[cur] += 1;
// 	  }
  
// 	  // Current note becomes active for future notes
// 	  active.push(cur);
// 	}
  
// 	// Penalty and final score
// 	let penalty = 0;
// 	for (let i = 0; i < n; i++) {
// 	  penalty += Math.abs(overlapsPerNote[i] - optimum);
// 	}
  
// 	return 1 - penalty / n;
//   };
  

export const scoreOverlap: ScoringsFunction = ({
	melody,
	voiceSplits,
	voices,
	params,
}) => {
	const scores: score[] = [];

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


/* OLD density */

// export const _scoreGrowthDensity = ({ melody, density, totalDuration }: {
// 	melody: Note[];
// 	density: number;
// 	totalDuration: number;
// }) => {
// 	let numSegments = Math.ceil(totalDuration / framesPerQNote);

// 	if (
// 		totalDuration > framesPerQNote * 8 &&
// 		totalDuration < framesPerQNote * 16
// 	) {
// 		numSegments = Math.ceil(totalDuration / (framesPerQNote * 2));
// 	} else if (totalDuration > framesPerQNote * 16) {
// 		numSegments = Math.ceil(totalDuration / (framesPerQNote * 4));
// 	}

// 	return calculateSegmentDensities(
// 		melody,
// 		totalDuration,
// 		density,
// 		Math.max(numSegments, 1),
// 	);
// };




// export const scoreGrowthDensity: ScoringsFunction = ({
// 	melody,
// 	voiceSplits,
// 	voices,
// 	params,
// }) => {
// 	const scores: number[] = [];
// 	const totalDuration = calcTotalLen(melody);

// 	// Bass
// 	if (voices[0]) {
// 		const evolvedMelody = limitMelody(melody, voiceSplits, [
// 			true,
// 			false,
// 			false,
// 		]);
// 		scores.push(
// 			_scoreGrowthDensity({
// 				melody: evolvedMelody,
// 				density: params[0].value,
// 				totalDuration,
// 			}),
// 		);
// 		console.log('low', params[0].value, evolvedMelody.length, scores.at(-1))
// 	}

// 	// Mid
// 	if (voices[1]) {
// 		const evolvedMelody = limitMelody(melody, voiceSplits, [
// 			false,
// 			true,
// 			false,
// 		]);
// 		scores.push(
// 			_scoreGrowthDensity({
// 				melody: evolvedMelody,
// 				density: params[1].value,
// 				totalDuration,
// 			}),
// 		);
// 		console.log('mid', params[1].value, evolvedMelody.length, scores.at(-1))
// 	}

// 	// High
// 	if (voices[2]) {
// 		const evolvedMelody = limitMelody(melody, voiceSplits, [
// 			false,
// 			false,
// 			true,
// 		]);
// 		scores.push(
// 			_scoreGrowthDensity({
// 				melody: evolvedMelody,
// 				density: params[2].value,
// 				totalDuration,
// 			}),
// 		);
// 		console.log('high', params[2].value, evolvedMelody.length, scores.at(-1))
// 	}

// 	return scores.reduce((acc, cur) => acc + cur) / scores.length;
// };


/* NEW density */

export const _scoreEvenDensity = ({
	melody,
	density,
	totalDuration,
}: {
	melody: Note[];
	density: number;
	totalDuration: number;
}) => {
	const totalQuarterNotes = Math.round(
		totalDuration / framesPerQNote
	);

	const expectedPerQN = density;

	// Tolerance = allowed deviation per quarter note
	const tolerance =
		density === 0
			? 0.25            // very strict for silence
			: Math.max(0.5, expectedPerQN * 0.5);

	const bins = new Array(totalQuarterNotes).fill(0);

	for (const note of melody) {
		const qIndex = Math.floor(note.position / framesPerQNote);
		if (qIndex >= 0 && qIndex < bins.length) {
			bins[qIndex]++;
		}
	}

	let errorSum = 0;
	for (const count of bins) {
		const normalizedDiff = (count - expectedPerQN) / tolerance;
		errorSum += normalizedDiff * normalizedDiff;
	}

	const mse = errorSum / bins.length;

	// Convert error → score (0..1)
	return Math.exp(-mse);
};



export const _scoreAbsoluteDensity = ({
	melody,
	density,
	totalDuration,
}: {
	melody: Note[];
	density: number;
	totalDuration: number;
}) => {
	const totalQuarterNotes = totalDuration / framesPerQNote;

	const actualNotes = melody.length;
	const expectedNotes = density * totalQuarterNotes;

	// How tolerant you want to be (in notes)
	// Smaller = stricter
	const tolerance = Math.max(1, expectedNotes * 0.25);

	const error = actualNotes - expectedNotes;

	// Gaussian falloff (range ~0..1)
	const score = Math.exp(-(error * error) / (2 * tolerance * tolerance));

	return score;
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
		const bass = limitMelody(melody, voiceSplits, [true, false, false]);
		scores.push(
			_scoreEvenDensity({
				melody: bass,
				density: params[0].value,
				totalDuration,
			}),
		);
		// console.log('low', params[0].value,  bass.length, scores.at(-1))
	}

	// Mid
	if (voices[1]) {
		const mid = limitMelody(melody, voiceSplits, [false, true, false]);
		scores.push(
			_scoreEvenDensity({
				melody: mid,
				density: params[1].value,
				totalDuration,
			}),
		);
		// console.log('mid', params[1].value,  mid.length, scores.at(-1))
	}

	// High
	if (voices[2]) {
		const high = limitMelody(melody, voiceSplits, [false, false, true]);
		scores.push(
			_scoreEvenDensity({
				melody: high,
				density: params[2].value,
				totalDuration,
			}),
		);
		// console.log('high', params[2].value,  high.length, scores.at(-1))
	}

	const avgScore = scores.length
	? scores.reduce((a, b) => a + b, 0) / scores.length
	: 0;

	// console.log('avgScore', avgScore)

	return avgScore 
};