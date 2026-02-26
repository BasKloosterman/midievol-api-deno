import { clamp, MutSize } from "./evo.ts";

const BPM_MIN = 50;
const BPM_MAX = 200;

// kans dat bpm überhaupt muteert per kind 
const BPM_MUT_CHANCE_SMALL = 0.03; // 3%
const BPM_MUT_CHANCE_MED = 0.06; // 6%
const BPM_MUT_CHANCE_LARGE = 0.10; // 10%

// max afwijking per mutatie in BPM
const BPM_DEV_SMALL = 0.20; 
const BPM_DEV_MED = 0.50;
const BPM_DEV_LARGE = 1.00;

//2 getallen achter de komma
function round2(n: number) {
return Math.round(n * 100) / 100;
}

// minimum hoorbare / zichtbare stap na afronding
const MIN_BPM_STEP = 0.01;

function randAddFloat(cur: number, maxDeviation: number, steepness: number) {

  // richting kiezen (sneller of trager)
  const direction = Math.random() <= 0.5 ? 1 : -1;

  // grootte van mutatie (biased naar klein)
  let magnitude = Math.pow(Math.random(), steepness) * maxDeviation;

  // minimale mutatie 
  if (magnitude < MIN_BPM_STEP) {
    magnitude = MIN_BPM_STEP;
  }

  const delta = magnitude * direction;

  return cur + delta;
}

export function maybeMutateBpm(bpm: number, mutSize: MutSize) {
    const chance =
    mutSize === "small" ? BPM_MUT_CHANCE_SMALL :
    mutSize === "medium" ? BPM_MUT_CHANCE_MED :
    BPM_MUT_CHANCE_LARGE;

    if (Math.random() > chance) return bpm;

    const dev =
    mutSize === "small" ? BPM_DEV_SMALL :
    mutSize === "medium" ? BPM_DEV_MED :
    BPM_DEV_LARGE;

    // steepness hoog = meestal mini-stapje
    const next = randAddFloat(bpm, dev, 3);
    return round2(clamp(next, BPM_MIN, BPM_MAX));
}


// // ✅ ADDED: bpm mutatie op kind-niveau
// const childBpm = maybeMutateBpm(nBpm, mutSize);

// const evolvedScores = scoreDefs.map((def) =>
// def.weight !== 0
// ? applySplitVoices(def.fn, {
// melody: evolved,
// params: def.params,
// voiceSplits,
// voices: def.voices,
// splitVoices: def.splitVoices,
// // bpm: childBpm, // (optioneel later)
// })
// : null
// );
// children.push({ melody: evolved.slice(), bpm: childBpm, scores: evolvedScores });
// }

// // CHANGED: evo signature: neem bpm mee en return bpm
// // ─────────────────────────────────────────────
// export function evo(
// melody: Note[],
// nChildren: number,
// nGens: number,
// scoreDefs: ScoringDefinition[],
// voiceSplits: { min: number; max: number },
// bpm: number, // ✅ ADDED
// ) {
// if (melody.length === 0) {
// throw new Error("Cannot evolve empty melody");
// }

// let nMelody = melody;
// let nBpm = round2(clamp(bpm, BPM_MIN, BPM_MAX)); // ✅ ADDED
// let nScoreList: (FuncScore | null)[] = [];
// let nScore: score = 0;



// Meegeven BPM best child:

// if (bestChild) {
// nMelody = bestChild.melody;
// nBpm = bestChild.bpm; // ✅ ADDED
// nScoreList = bestChild.scores;
// nScore = bestChild.combinedScore;
// }

// // ✅ CHANGED: return bpm mee
// return { melody: nMelody, bpm: nBpm, score: nScore, scoreList: nScoreList };
// }
