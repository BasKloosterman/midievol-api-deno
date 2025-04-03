// base4.ts

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export function numToBase4(num: number): string {
	if (num === 0) return "A";

	const base4Chars = ["A", "G", "C", "T"];
	let result = "";

	while (num > 0) {
		result = base4Chars[num % 4] + result;
		num = Math.floor(num / 4);
	}

	return result;
}

export function base4ToNum(base4Str: string, maxVal: number): number {
	const base4Chars: Record<string, number> = {
		A: 0,
		G: 1,
		C: 2,
		T: 3,
	};

	let num = 0;
	for (const char of base4Str) {
		num = num * 4 + base4Chars[char];
	}

	return clamp(num, 0, maxVal);
}
