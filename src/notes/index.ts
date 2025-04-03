// note.ts
import { base4ToNum, numToBase4 } from "./base4.ts";

export const framesPerQNote = 600;
export const qNote = framesPerQNote;

export const semitone = 10;

export const intervals = {
	m_second: semitone,
	second: semitone * 2,
	m_third: semitone * 3,
	third: semitone * 4,
	octave: semitone * 12,
};

type NotePart = [
	name: keyof NoteData,
	lenBytes: number,
	maxVal: number,
	maxEvoChange: number,
];

const noteParts: NotePart[] = [
	["pitch", 2, 840, 840],
	["length", 2, framesPerQNote * 8, framesPerQNote * 8],
	["volume", 1, 127, 127],
	["position", 4, 1 << 20, framesPerQNote * 8],
];

// total number of characters in a note string
const noteLen = noteParts.reduce((acc, cur) => acc + cur[1] * 4, 0);

interface NoteData {
	pitch: number;
	length: number;
	volume: number;
	position: number;
}

export class Note implements NoteData {
	pitch: number = 0;
	length: number = 0;
	volume: number = 0;
	position: number = 0;

	constructor(opts: Partial<NoteData> = {}, noteStr: string = "") {
		if (noteStr) {
			this._fromStr(noteStr);
		} else {
			this.pitch = opts.pitch ?? 0;
			this.length = opts.length ?? 0;
			this.volume = opts.volume ?? 0;
			this.position = opts.position ?? 0;
		}
	}

	private _fromStr(dna: string): void {
		if (dna.length !== noteLen) {
			throw new Error(`DNA string must be ${noteLen} characters long`);
		}

		let offset = 0;

		for (const [name, lenBytes, maxVal] of noteParts) {
			const charCount = lenBytes * 4;
			const chunk = dna.slice(offset, offset + charCount);
			(this as any)[name] = base4ToNum(chunk, maxVal);
			offset += charCount;
		}
	}

	toStr(): string {
		let ret = "";

		for (const [name, lenBytes] of noteParts) {
			const value = (this as any)[name];
			ret += numToBase4(value).padStart(lenBytes * 4, "A");
		}

		return ret;
	}

	copy(): Note {
		return new Note({
			pitch: this.pitch,
			length: this.length,
			volume: this.volume,
			position: this.position,
		});
	}

	toString(): string {
		return `{"pitch": ${this.pitch}, "length": ${this.length}, "volume": ${this.volume}, "position": ${this.position}}`;
	}
}

export function parseDNA(dna: string): Note[] {
	if (dna === "") {
		throw new Error("Cannot parse empty DNA");
	}

	const notes: Note[] = [];

	for (let i = 0; i < dna.length; i += noteLen) {
		const chunk = dna.slice(i, i + noteLen);
		notes.push(new Note({}, chunk));
	}

	return notes;
}

export function melodyToDNA(notes: Note[]): string {
	return notes.map((n) => n.toStr()).join("");
}
