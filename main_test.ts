import { assertEquals } from "@std/assert";

import { framesPerQNote, Note, parseDNA } from "./src/notes/index.ts";
import { duplicateNotes, evo, getMutSize, removeNotes } from "./evo.ts";
import { normalizeMinOneToOne, scoringFunctions } from "./handlers.ts";
import { writeFileSync } from "node:fs";
import { scoreNoteCount } from "./src/scoring/normalize.ts";

export const numToBase4 = (num: number) : string => {
    if (num === 0) return "0";
    
    let base4String = '';

    const base4Chars = ['A', 'G', 'C', 'T'];  // Mapping for 0 -> A, 1 -> G, 2 -> C, 3 -> T

    // Loop until the number is reduced to zero
    while (num > 0) {
        base4String = base4Chars[num % 4] + base4String;
        num = Math.floor(num / 4);
    }

    return base4String;
}

const getRandomNote = () => Math.round((Math.random() * 840))

export const createRandomNote = () => {
    
    return [
        numToBase4(getRandomNote()).padStart(8, 'A'),
        numToBase4(Math.round((Math.random() * 2000))).padStart(8, 'A'),
        numToBase4(Math.round((Math.random() * 127))).padStart(4, 'A'),
        numToBase4(Math.round((Math.random() * 600*32))).padStart(16, 'A')
    ].join('')
}

export const createRandomMelody = (numNotes: number) => {
    let dna = ''

    for (let i = 0; i < numNotes; i++) {
        dna += createRandomNote()
    }

    return dna
}

export const calcMelodyLength = (melody: Note[]) => {
    if (!melody.length) {
        return 1;
    }

    const latestNote = Math.max(...melody.map(n => n.position + n.length))
    let loopRange_ = Math.ceil(latestNote / (1 * framesPerQNote));
    if (latestNote % (1 * framesPerQNote) === 0) {
        loopRange_ += 1;
    }

    return loopRange_;
};



const run = () => {
	let melody = parseDNA(createRandomMelody(40)).sort((a, b) => a.position - b.position);
	let i = 0;
	const gens = 1000;
	const notesPerGen : [number, number][] = []
	const n = [...scoringFunctions]
	n[8] = {
			fn: scoreNoteCount,
			weight: 1,
			normalizationFn: normalizeMinOneToOne,
			params: [{
				name: "Q Note count",
				range: [0, 160],
				value: 8,
				type: "int",
			}],
			voices: [true, true, true],
		}
	while (i < gens) {
		const { melody: evolved} = evo(
			melody,
			100,
			10,
			n,
			{min : 0, max: 84},
		);
		melody = evolved
		// const mutSize = getMutSize();
		// melody = duplicateNotes([...melody], mutSize)
		// melody = removeNotes([...melody], mutSize)
		
		notesPerGen.push([melody.length, calcMelodyLength(melody)])

		i++
	}

	writeFileSync('./test_output.json', JSON.stringify(notesPerGen))
}

run()
