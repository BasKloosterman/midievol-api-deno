import { Note } from "../notes/index.ts";
import { ScoringsFunction } from "./index.ts";
import { limitMelody } from "./util.ts";

/**
 * Velocity diversity + preference scorer.
 * - targetDiversity: desired spread (stddev) of velocities, 0..1
 * - velocityPreference: desired average velocity, 0..1 (soft..loud)
 *
 * Returns score in [-1..1]
 */
function calculateVelocityDiversity(
	velocities: number[],
	targetDiversity: number = 1,
	velocityPreference: number = 0.5,
): number {
	if (velocities.length === 0) return 0;

	targetDiversity = Math.max(0, Math.min(targetDiversity, 1));

	const minVel = 10;
	const maxVel = 127;

	// normalize velocities to 0..1
	const norm = velocities.map((v) =>
		Math.max(0, Math.min((v - minVel) / (maxVel - minVel), 1)),
	);

	const mean = norm.reduce((a, b) => a + b, 0) / norm.length;
	const variance =
		norm.reduce((acc, x) => acc + (x - mean) * (x - mean), 0) / norm.length;

	const std = Math.sqrt(variance);

	// std in [0..0.5] for values in [0..1] (max at half 0s half 1s)
	const stdNorm = Math.min(std / 0.5, 1);

	// match target diversity
	const maxDistance = Math.max(targetDiversity, 1 - targetDiversity) || 1;
	const rawScore = 1 - Math.abs(stdNorm - targetDiversity) / maxDistance;
	const diversityScore = Math.max(0, Math.min(rawScore, 1));

	// preference on average velocity (in original units)
	const pref = Math.max(0, Math.min(velocityPreference, 1));
	const target = minVel + pref * (maxVel - minVel);

	const avgVel = velocities.reduce((a, b) => a + b, 0) / velocities.length;

	// score: 1 if avgVel == target, 0 if far away as possible
	const maxDist = Math.max(target - minVel, maxVel - target) || 1;
	const velScore = 1 - Math.min(Math.abs(avgVel - target) / maxDist, 1);

	// Dynamic mix: more notes => diversity more reliable => weight it more
	// Mix in [0.35..0.65] (same as your length scorer)
	const n = velocities.length;
	const t = Math.max(0, Math.min((n - 8) / 40, 1));
	const diversityMix = 0.35 + 0.30 * t;

	const combined = (diversityMix * diversityScore) + ((1 - diversityMix) * velScore);

	return combined * 2 - 1;
}

export const scoreVelocityDiversity: ScoringsFunction = ({
	melody,
	params,
	voiceSplits,
	voices,
}) => {
	// This function will be called per-voice if splitVoices=true in config,
	// thanks to applySplitVoices. So we just score the given melody.
	melody = limitMelody(melody, voiceSplits, voices);
	if (melody.length === 0) return null;

	const targetDiversity = params.length > 0 ? params[0].value : 0.5;
	const velocityPreference = params.length > 1 ? params[1].value : 0.5;

	const velocities = melody.map((n: Note) => n.volume);

	const score = calculateVelocityDiversity(
		velocities,
		targetDiversity,
		velocityPreference,
	);

	return { score, info: [] };
};