import { framesPerQNote } from "../notes/index.ts";
import { scoreValue } from "./util.ts";
import { ScoringsFunction } from "./index.ts";
import { limitMelody } from "./util.ts";

export const scoreGridness16th: ScoringsFunction = ({
	melody,
	params,
	voiceSplits,
	voices
}) => {
	melody = limitMelody(melody, voiceSplits, voices)
	if (melody.length === 0) {
		return null
	}
	const optimumParam = params.length > 0 ? params[0].value : 0.5;
	const optimum = optimumParam || 1;

	const gridDiffs = melody
		.map((note) => {
			const mod = framesPerQNote / 4;
			return Math.min(-note.position % mod, note.position % mod);
		})
		.sort((a, b) => a - b);

	const optimumNoteCount = Math.round(optimum * melody.length);
	const average = gridDiffs.slice(0, optimumNoteCount).reduce(
		(sum, val) => sum + val,
		0,
	) / optimumNoteCount;

	return scoreValue(0, average, framesPerQNote / 8) * 2 - 1;
};
