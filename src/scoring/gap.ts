// src/scoring/maxGap.ts
import { Note, framesPerQNote } from "../notes/index.ts";
import { ScoringsFunction } from "./index.ts";
import { getNumberParam, limitMelody } from "./util.ts";



/**
 * 1) Onset-events zonder merge:
 *    - Akkoorden met exact dezelfde position tellen als 1 event.
 *    - Micro-timing (paar frames verschil) telt als aparte events (bewust).
 */
function extractOnsetEventsExact(notes: Note[]): number[] {
  const unique = new Set<number>();
  for (const n of notes) unique.add(n.position);
  return Array.from(unique).sort((a, b) => a - b);
}

/**
 * 2) Grootste gap tussen opeenvolgende events.
 */
function computeMaxGapFrames(events: number[]): { maxGapFrames: number; gapsCount: number } {
  if (events.length < 2) return { maxGapFrames: 0, gapsCount: 0 };

  let maxGap = 0;
  for (let i = 0; i < events.length - 1; i++) {
    const gap = events[i + 1] - events[i];
    if (gap > maxGap) maxGap = gap;
  }
  return { maxGapFrames: maxGap, gapsCount: events.length - 1 };
}

/**
 * 3) Straf alleen als max gap groter is dan toegestaan.
 *    Score = 0 (goed) tot negatief (slecht).
 */
function _scoreMaxGap(maxGapFrames: number, allowedFrames: number) {
  if (allowedFrames <= 0) return { score: -999, penalty: 999 };

  if (maxGapFrames <= allowedFrames) return { score: 0, penalty: 0 };

  const penalty = (maxGapFrames - allowedFrames) / allowedFrames;
  return { score: -penalty, penalty };
}

/**
 * ScoringsFunction wrapper
 *
 * params:
 *  0) maxGapBeats (in beats)
 */
export const scoreMaxGap: ScoringsFunction = ({ melody, params, voiceSplits, voices }) => {
  melody = limitMelody(melody, voiceSplits, voices);
  if (melody.length === 0) return null;

  const maxGapBeats = getNumberParam(params, 0, 3); // default 3 beats
  const allowedFrames = maxGapBeats * framesPerQNote;

  const events = extractOnsetEventsExact(melody);
  if (events.length < 2) {
    return { score: -999, info: []};
  }

  const { maxGapFrames } = computeMaxGapFrames(events);
  const { score } = _scoreMaxGap(maxGapFrames, allowedFrames);

  return {
    score,
    info: []
  };
};