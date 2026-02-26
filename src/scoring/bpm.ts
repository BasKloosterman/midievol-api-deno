import { ScoringsFunction } from "./index.ts";

// Constants
const MIN_BPM = 50.0;
const MAX_BPM = 200.0;
const BIN_WIDTH = 5.0;

// Equivalent of floor((MAX_BPM - MIN_BPM) / BIN_WIDTH)
const NUM_BANDS = Math.floor((MAX_BPM - MIN_BPM) / BIN_WIDTH);

// Band i:
// L = MIN_BPM + i * BIN_WIDTH
// U = L + BIN_WIDTH

function clampInt(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

function bandFromQ(Q: number): { L: number; U: number } {
  // Q comes from the user
  const q = clampInt(Math.trunc(Q), 0, NUM_BANDS - 1);

  const L = MIN_BPM + q * BIN_WIDTH;
  const U = L + BIN_WIDTH;
  return { L, U };
}

function distanceToBand(bpm: number, L: number, U: number): number {
  if (bpm < L) return L - bpm;
  if (bpm > U) return bpm - U;
  return 0.0;
}

// ---------- Scoring ----------
// input:
//   bpm: BPM of this individual
//   Q: which band is the target (user selects this)
// output:
//   rawScore: higher is better, 0 is perfect, negative is "wrong"
function scoreBpmBandRaw(bpm: number, Q: number): number {
  const { L, U } = bandFromQ(Q);
  const d = distanceToBand(bpm, L, U);
  const rawScore = -d;
  return rawScore;
}

function bandIndexFromBpm(targetBpm: number): number {
    const q = Math.floor((targetBpm - MIN_BPM) / BIN_WIDTH);
    return clampInt(q, 0, NUM_BANDS - 1);
  }

export const scoreBpm: ScoringsFunction = ({
  params,
  bpm
}) => {
    const optimum = (typeof params[0]?.value == 'number') ? params[0]?.value : 90
    const score = scoreBpmBandRaw(bpm, bandIndexFromBpm(optimum));

    return { score, info: [] };
};