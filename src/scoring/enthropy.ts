import { ScoringsFunction } from "./index.ts";
import { limitMelody } from "./util.ts";

function calculateNoteLengthDiversity(
	noteLengths: number[],
	targetDiversity: number = 1,
	noteLengthPreference: number = 0.5, // 0 = short, 1 = long
): number {
	if (noteLengths.length === 0) return 0;

	// Frequency count
	const frequencyMap = new Map<number, number>();
	for (const length of noteLengths) {
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
	let score = 1 - Math.abs(diversity - targetDiversity);

	// Duration preference only matters if targetDiversity is low
	if (targetDiversity < 0.2 && frequencyMap.size === 1) {
		const preferredMin = 75;
		const preferredMax = 3600;

		const dominantLength = Array.from(frequencyMap.keys())[0];

		// Normalize note length to [0,1] scale
		const normalizedLength = Math.min(
			1,
			Math.max(
				0,
				(dominantLength - preferredMin) / (preferredMax - preferredMin),
			),
		);

		// Score the match to the preference (closer = better)
		const preferenceMatch = 1 -
			Math.abs(normalizedLength - noteLengthPreference);

		// Combine with original score, reduce influence if poor match
		score *= preferenceMatch;
	}

	return score;
}

export const scoreNoteDiversity: ScoringsFunction = (
	{ melody, params, voiceSplits, voices },
) => {
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) {
		return null;
	}

	return calculateNoteLengthDiversity(
		melody.map((n) => n.length),
		params[0].value,
		params[1].value,
	);
};
