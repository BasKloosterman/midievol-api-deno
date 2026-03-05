import { calcTotalLen, limitMelody } from "./util.ts";
import { framesPerQNote, Note } from "../notes/index.ts";
import { ScoringsFunction } from "./index.ts";

const normPitchMin = 240;
const normPitchMax = 480;
const normLengthMin = framesPerQNote / 2;
const normLengthMax = framesPerQNote;

// export function scoreNoteCount(
// 	notes: Note[],
// 	optimalCount = 15,
// 	maxScore = 1,
// ): number {
// 	const noteCount = notes.length;
// 	const deviation = Math.abs(noteCount - optimalCount);
// 	const penalty = Math.exp(-deviation / 5);
// 	return maxScore * penalty;
// }
export const scoreGrowth: ScoringsFunction = (
  { melody, voiceSplits, voices },
) => {
  melody = limitMelody(melody, voiceSplits, voices);

  const n = melody.length;

	let score;

	if (n <= 12) {
  	score = n;
	} else {
  	score = 12 + Math.sqrt(n - 12);
	}

  if (n === 0) return null;

  return { score, info: [] };
};

export const scoreMusicLength: ScoringsFunction = (
	{ melody, voiceSplits, voices, params },
) => {
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) return null;

	const len = calcTotalLen(melody);

	const target = params[0].value * framesPerQNote;

	// plateau totaal = 20% van target, met max 4 tellen totaal
	const plateauTotal = Math.min(0.2 * target, 4 * framesPerQNote);
	const half = plateauTotal / 2;

	const dist = Math.abs(target - len);

	// shoulder zone: even breed als half-plateau (aanpasbaar)
	const shoulder = half;

	let penalty = 0;

	if (dist <= half) {
		penalty = 0;
	} else if (dist <= half + shoulder) {
		// mild: kwadratisch oplopend van 0..shoulder
		const x = (dist - half) / shoulder; // 0..1
		penalty = (x * x) * shoulder;
	} else {
		// daarna lineair, startend vanaf shoulder
		penalty = shoulder + (dist - (half + shoulder));
	}

	return { score: -penalty, info: [] };
};

// Deprecated, not usefull anymore, is regulated in other funcs
// export const scoreNormalizeMelodic: ScoringsFunction = (
// 	{ melody, voiceSplits, voices },
// ) => {
// 	melody = limitMelody(melody, voiceSplits, voices);
// 	if (melody.length === 0) {
// 		return null;
// 	}
// 	let pitchPenalty = 0;
// 	for (const note of melody) {
// 		if (note.pitch > normPitchMax) {
// 			pitchPenalty += Math.abs(note.pitch - normPitchMax);
// 		} else if (note.pitch < normPitchMin) {
// 			pitchPenalty += Math.abs(normPitchMin - note.pitch);
// 		}
// 	}
// 	const avgPitchPenalty = pitchPenalty / melody.length;
// 	const scoreReach = 1 - avgPitchPenalty * (2 / 360);

// 	let lengthPenalty = 0;
// 	for (const note of melody) {
// 		if (note.length > normLengthMax) {
// 			lengthPenalty += Math.abs(note.length - normLengthMax);
// 		} else if (note.length < normLengthMin) {
// 			lengthPenalty += Math.abs(normLengthMin - note.length);
// 		}
// 	}
// 	const avgLengthPenalty = lengthPenalty / melody.length;
// 	const scoreLength = 1 -
// 		Math.min(450, Math.max(0, Math.abs(avgLengthPenalty))) * (2 / 450);

// 	const scoreNoteCountNorm = 1 - Math.abs(melody.length - 15) * (1 / 15);
// 	// Returns 0..1 so transform to -1..1
// 	return ((scoreReach + scoreNoteCountNorm + scoreLength) / 3) * 2 - 1;
// };
