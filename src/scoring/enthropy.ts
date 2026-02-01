import { ScoringsFunction } from "./index.ts";
import { limitMelody } from "./util.ts";


function scoreNoteLengthsByPreference(notes: number[], preference: number): number {
	if (notes.length === 0) return 0;

	// Define min and max lengths
	const minLen = 75;
	const maxLen = 2400;

	// Interpolate target length
	const target = minLen + preference * (maxLen - minLen);

	// Define a helper to score closeness to target (1 = exact match, 0 = farthest)
	function proximityScore(length: number): number {
		const maxDist = Math.max(target - minLen, maxLen - target);
		const dist = Math.abs(length - target);
		return 1 - Math.min(dist / maxDist, 1); // clamp to [0, 1]
	}

	const scores = notes.map(note => proximityScore(note));
	const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

	return avgScore;
}



function calculateNoteLengthDiversity(
	noteLengths: number[],
	targetDiversity: number = 1,
	noteLengthPreference: number = 0.5, // 0 = short, 1 = long
): number {
	if (noteLengths.length === 0) return 0;

	// Frequency count
	const frequencyMap = new Map<number, number>();
	for (let length of noteLengths) {
		length = Math.round(length % 75)
		frequencyMap.set(length, (frequencyMap.get(length) || 0) + 1);
	}

	// Normalize distribution
	const totalNotes = noteLengths.length;
	const probabilities = Array.from(frequencyMap.values()).map(
		(count) => count / totalNotes,
	);

	// Shannon entropy
	const entropy = -probabilities.reduce(
		(sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0),
		0,
	);

	// Normalize entropy
	const maxEntropy = Math.log2(frequencyMap.size);
	const diversity = maxEntropy > 0 ? entropy / maxEntropy : 0;

	// Score based on diversity target
	const score = 1 - Math.abs(diversity - targetDiversity);

	// Combine with original score, reduce influence if poor match
	const scoreLengthScore = scoreNoteLengthsByPreference(noteLengths, noteLengthPreference);


	return ((targetDiversity * score) + ((1 - targetDiversity) * scoreLengthScore)) * 2 - 1;
}

export const scoreNoteDiversity: ScoringsFunction = (
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
