import { ScoringsFunction } from "./index.ts";
import { limitMelody } from "./util.ts";


function scoreNoteLengthsByPreference(notes: number[], preference: number): number {
	if (notes.length === 0) return 0;

	const minLen = 75;
	const maxLen = 2400;
	

	const pref = Math.max(0, Math.min(preference, 1));
	const target = minLen + pref * (maxLen - minLen);

	const maxDist = Math.max(target - minLen, maxLen - target) || 1;

	function proximityScore(length: number): number {
  	const dist = Math.abs(length - target);
  	return 1 - Math.min(dist / maxDist, 1);
}

	const scores = notes.map(note => proximityScore(note));
	return scores.reduce((a, b) => a + b, 0) / scores.length;
}



function calculateNoteLengthDiversity(
	noteLengths: number[],
	targetDiversity: number = 1,
	noteLengthPreference: number = 0.5, // 0 = short, 1 = long
): number {
	if (noteLengths.length === 0) return 0;
	targetDiversity = Math.max(0, Math.min(targetDiversity, 1));

	// --- DIVERSITY via standaarddeviatie (continu, geen buckets) ---
	const minLen = 75;
	const maxLen = 2400;

// normalize lengths to 0..1
const norm = noteLengths.map((l) =>
  Math.max(0, Math.min((l - minLen) / (maxLen - minLen), 1)),
);

const mean = norm.reduce((a, b) => a + b, 0) / norm.length;
const variance =
  norm.reduce((acc, x) => acc + (x - mean) * (x - mean), 0) / norm.length;

const std = Math.sqrt(variance);

// std in [0..0.5] for values in [0..1] (max at half 0s half 1s)
const stdNorm = Math.min(std / 0.5, 1); // map to 0..1

// match target
const maxDistance = Math.max(targetDiversity, 1 - targetDiversity) || 1;
const rawScore = 1 - Math.abs(stdNorm - targetDiversity) / maxDistance;
const score = Math.max(0, Math.min(rawScore, 1));



	const pref = Math.max(0, Math.min(noteLengthPreference, 1));
	const target = minLen + pref * (maxLen - minLen);

	const avgLen = noteLengths.reduce((a, b) => a + b, 0) / noteLengths.length;

	// score: 1 als avgLen == target, 0 als zo ver mogelijk weg
	const maxDist = Math.max(target - minLen, maxLen - target) || 1;
	const lengthScore = 1 - Math.min(Math.abs(avgLen - target) / maxDist, 1);	

	// Dynamische mix: meer noten => diversity betrouwbaarder => zwaarder meewegen
	// Subtiel: mix in [0.35..0.65]
	const n = noteLengths.length;

	// n=8 => t=0, n=48 => t=1 (clamped)
	const t = Math.max(0, Math.min((n - 8) / 40, 1));

	const diversityMix = 0.35 + 0.30 * t; // 0.35 -> 0.65

	const combined = (diversityMix * score) + ((1 - diversityMix) * lengthScore);
	
	


	return combined * 2 - 1;
}

export const scoreNoteLengthDiversity: ScoringsFunction = (
	{ melody, params, voiceSplits, voices },
) => {
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) {
		return null;
	}

	return {score: calculateNoteLengthDiversity(
		melody.map((n) => n.length),
		params[0].value,
		params[1].value,
	), info: []};
};
