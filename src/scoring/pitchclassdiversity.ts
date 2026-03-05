import { ScoringsFunction } from "./index.ts";
import { limitMelody } from "./util.ts";

function clamp(x: number, lo: number, hi: number) {
	return Math.max(lo, Math.min(hi, x));
}

/**
 * Evenness binnen de gebruikte pitchclasses (K):
 * - 1 = perfect gelijk verdeeld over de pitchclasses die voorkomen
 * - 0 = extreem scheef (bijv. alles op 1 pitchclass)
 *
 * Belangrijk: deze score geeft GEEN voordeel aan meer pitchclasses.
 * 6 pitchclasses perfect verdeeld kan even hoog scoren als 12 perfect verdeeld.
 */
function evennessWithinK01(pcs: number[]): number {
	if (pcs.length === 0) return 0;

	const counts = new Array(12).fill(0);
	for (const pc of pcs) counts[pc]++;

	const total = pcs.length;

	// kansen alleen voor pitchclasses die voorkomen
	const probs = counts.filter((c) => c > 0).map((c) => c / total);
	const K = probs.length;
	if (K <= 1) return 0;

	const u = 1 / K;

	// L1 afstand tot uniform: sum |p_i - 1/K|
	const l1 = probs.reduce((acc, p) => acc + Math.abs(p - u), 0);

	// max L1 bij K categorieën: 2*(1 - 1/K) (alles in 1 bucket)
	const l1Max = 2 * (1 - u);

	return clamp(1 - l1 / l1Max, 0, 1);
}

export const scorePitchClassDiversity: ScoringsFunction = (
	{ melody, params, voiceSplits, voices },
) => {
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) return null;

	// Params:
	// [0] min diversity (0.1..1)
	// [1] max diversity (0.1..1)
	let minD = params.length > 0 ? params[0].value : 0.35;
	let maxD = params.length > 1 ? params[1].value : 0.60;

	minD = clamp(minD, 0.1, 1);
	maxD = clamp(maxD, 0.1, 1);
	if (minD > maxD) [minD, maxD] = [maxD, minD];

	// pitch classes 0..11 (safe modulo)
	const pcs = melody.map((n) => {
		const p = Math.round(n.pitch / 10);
		return ((p % 12) + 12) % 12;
	});

	const unique = new Set(pcs).size;
	const div = unique / 12; // 0..1

	// --- Range plateau score (0..1) ---
	// binnen [minD,maxD] => score 1
	// erbuiten => zachte shoulder, dan lineair
	const range = Math.max(1e-6, maxD - minD);
	const shoulder = Math.max(0.02, 0.25 * range);

	let penalty01 = 0;

	if (div < minD) {
		const d = minD - div;
		if (d <= shoulder) {
			const x = d / shoulder; // 0..1
			penalty01 = x * x * (shoulder / range);
		} else {
			penalty01 = (shoulder / range) + (d - shoulder) / range;
		}
	} else if (div > maxD) {
		const d = div - maxD;
		if (d <= shoulder) {
			const x = d / shoulder; // 0..1
			penalty01 = x * x * (shoulder / range);
		} else {
			penalty01 = (shoulder / range) + (d - shoulder) / range;
		}
	}

	const rangeScore01 = clamp(1 - penalty01, 0, 1);

	// --- Evenness binnen K (0..1) ---
	const evenness01 = evennessWithinK01(pcs);

	// Betrouwbaarheid: bij weinig noten is verdeling minder informatief.
	// Dit voorkomt dat "super korte" melodieën hier onterecht winnen.
	const n = pcs.length;
	const reliability = clamp((n - 8) / 40, 0, 1);

	const evennessMix = 0.35;
	const evennessWeighted = evenness01 * reliability;

	const score01 =
		(1 - evennessMix) * rangeScore01 +
		evennessMix * evennessWeighted;

	return {
		score: score01 * 2 - 1, // naar [-1..1]
		info: [
			{ name: "uniquePCs", value: String(unique) },
			{ name: "div", value: div.toFixed(3) },
			{ name: "even", value: evenness01.toFixed(3) },
			{ name: "rel", value: reliability.toFixed(3) },
			{ name: "range", value: `${minD.toFixed(2)}..${maxD.toFixed(2)}` },
		],
	};
};