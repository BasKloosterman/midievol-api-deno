// src/scoring/energy.ts
import { Note, framesPerQNote } from '../notes/index.ts'
import { ScoreInfo, ScoringsFunction } from './index.ts'
import { getNumberParam, limitMelody } from './util.ts'

/**
 * ENERGY WAVES (ratio-based)
 *
 * Idee:
 * - We schuiven een window van 1 maat over de muziek (in frames).
 * - In elk window tellen we hoeveel "events" er zijn.
 * - Event = startmoment. Akkoorden tellen als 1 event (met tolerantie).
 * - We kijken NIET naar absolute aantallen, maar naar de verhouding tussen opeenvolgende windows:
 *      r = (E_next + eps) / (E_prev + eps)
 * - Gebruiker stelt een ondergrens (MinVar) en bovengrens (MaxVar) in.
 *   Buiten die band => penalty (spikey / bursts).
 *
 * Slimme uitzondering:
 * - Als E_prev == 0 of E_next == 0, zien we dat als phrase boundary (stilte/inzet),
 *   en straffen we die overgang NIET als spike.
 */

// ---------------------------------------------------------
// Param helper
// ---------------------------------------------------------
// function getNumberParam(
//     params: Param[],
//     idx: number,
//     fallback: number
// ): number {
//     const v = params?.[idx]?.value
//     return typeof v === 'number' && Number.isFinite(v) ? v : fallback
// }

/**
 * 1) Zet noten om naar onset-events (startmomenten), met "merge tolerance".
 *
 * Waarom:
 * - Als meerdere noten bijna tegelijk starten, horen we dat als 1 akkoord / 1 attack.
 * - Als je die apart telt, lijkt de ritmische "drukte" onterecht hoger.
 *
 * Hoe:
 * - Sorteer alle startposities.
 * - Maak clusters: alles dat binnen toleranceFrames van het BEGIN van de cluster valt, is 1 event.
 *   (Dus geen ketting-effect: 0, 9, 18 met tol=10 wordt NIET 1 event; 18 is te ver van 0.)
 */
function extractOnsetEventsMerged(
    notes: Note[],
    toleranceFrames: number
): number[] {
    if (notes.length === 0) return []

    const starts = notes.map((n) => n.position).sort((a, b) => a - b)

    const events: number[] = []
    let clusterStart = starts[0]
    events.push(clusterStart)

    for (let i = 1; i < starts.length; i++) {
        const t = starts[i]

        // Binnen tolerance t.o.v. clusterStart => zelfde event (zelfde "attack")
        if (t - clusterStart <= toleranceFrames) continue

        // Anders: nieuw event / nieuwe cluster
        clusterStart = t
        events.push(clusterStart)
    }

    return events
}

/**
 * 2) Tel energy per sliding window.
 *
 * Input:
 * - events: gesorteerde event-posities (frames)
 * - windowFrames: lengte van het window (bijv. 1 maat)
 * - stepFrames: hoeveel frames het window opschuift per stap (bijv. 1 beat)
 *
 * Output:
 * - energy[]: voor elk window het #events in [t, t+window)
 *
 * We doen dit efficiënt met twee pointers (left/right) omdat events al gesorteerd zijn.
 */
function computeEnergySeries(
    events: number[],
    windowFrames: number,
    stepFrames: number,
    rangeStart: number,
    rangeEnd: number
): number[] {
    const energy: number[] = []
    let left = 0
    let right = 0

    for (let t = rangeStart; t + windowFrames <= rangeEnd; t += stepFrames) {
        const wStart = t
        const wEnd = t + windowFrames

        // left -> eerste event >= wStart
        while (left < events.length && events[left] < wStart) left++

        // right -> eerste event >= wEnd
        if (right < left) right = left
        while (right < events.length && events[right] < wEnd) right++

        energy.push(right - left)
    }

    return energy
}

/**
 * 3) Maak ratio’s tussen opeenvolgende energy-windows.
 *
 * r[i] = (E[i+1] + eps) / (E[i] + eps)
 *
 * Waarom eps:
 * - voorkomt rare delingen bij 0
 * - maakt 0->1 niet “oneindig”, maar gewoon duidelijk groter
 *
 * eps=1 is een fijne default in jullie context.
 */
function computeRatios(energy: number[], eps = 1): number[] {
    const ratios: number[] = []
    for (let i = 0; i < energy.length - 1; i++) {
        ratios.push((energy[i + 1] + eps) / (energy[i] + eps))
    }
    return ratios
}

/**
 * 4) Score de ratio’s met een band [MinVar, MaxVar].
 *
 * - Binnen band: OK (geen penalty)
 * - Buiten band: penalty op basis van hoe ver erbuiten
 *
 * Boundary-exception:
 * - Als E_prev==0 of E_next==0:
 *   dat is meestal stilte/inzet => phrase boundary => NIET straffen als “spike”.
 */
function scoreRatiosWithBoundaries(
    energy: number[],
    ratios: number[],
    varMinUser: number,   // 0..10
    varMaxUser: number,   // 0..10
    notesCount: number   // #onset events
): { score: number; info: ScoreInfo[] } {
    const tiny = 1e-6
    let penalty = 0

    const transitionsTotal = ratios.length
    let transitionsUsed = 0
    let boundariesSkipped = 0
    let outside = 0

    // Theoretisch maximum spike gegeven het materiaal:
    // rMaxPossible = (Emax+1)/(0+1) = Emax+1
    // EmaxPossible ~ notscount
    const EmaxPossible = Math.max(1, notesCount)
    const DmaxPossible = Math.log(EmaxPossible + 1) // |log(r)| max (ongeveer)

    // Map user 0..10 naar echte D-grenzen
    const MinVar = (Math.max(0, Math.min(10, varMinUser)) / 10) * DmaxPossible
    const MaxVar = (Math.max(0, Math.min(10, varMaxUser)) / 10) * DmaxPossible

    for (let i = 0; i < ratios.length; i++) {
    const eA = energy[i]
    const eB = energy[i + 1]

    if (eA === 0 && eB === 0) {
        boundariesSkipped++
        continue
    }

    const safeA = Math.max(eA, 1)
    const safeB = Math.max(eB, 1)

    transitionsUsed++

    const D = Math.abs(Math.log(safeB / safeA))
    if (!Number.isFinite(D)) continue

    // te vlak (alleen als MinVar > 0)
    if (MinVar > 0 && D < MinVar) {
        penalty += (MinVar - D) / (MinVar + tiny)
        outside++
    }
    // te spikey
    else if (D > MaxVar) {
        penalty += (D - MaxVar) / (MaxVar + tiny)
        outside++
    }

    }

    const rawScore = -penalty

    const info: ScoreInfo[] = [
        { name: 'penalty', value: '' + penalty },
        {
            name: 'outsideRate',
            value: '' + (transitionsUsed > 0 ? outside / transitionsUsed : 0),
        },
        { name: 'boundariesSkipped', value: '' + boundariesSkipped },
        { name: 'transitionsTotal', value: '' + transitionsTotal },
        { name: 'transitionsUsed', value: '' + transitionsUsed },
        { name: 'notesCount', value: '' + notesCount },
        { name: 'DmaxPossible', value: '' + DmaxPossible },
        { name: 'MinVar', value: '' + MinVar },
        { name: 'MaxVar', value: '' + MaxVar },
    ]

    return { score: rawScore, info }
};

// ---------------------------------------------------------
// De ScoringsFunction wrapper (zoals jullie andere scorers)
// ---------------------------------------------------------
export const scoreEnergyWaves: ScoringsFunction = ({
    melody,
    params,
    voiceSplits,
    voices,
}) => {
    melody = limitMelody(melody, voiceSplits, voices)
    if (melody.length === 0) return null

    // ---- User params ----
    // 0) minVar  : ondergrens verhouding
    // 1) maxVar : bovengrens verhouding
    // 2) beatsPerMeasure : maatlengte (default 4)
    // 3) stepBeats       : schuifstap (default 1 beat)
    // 4) onsetMergeSubdivision : "hoe strak is tegelijk?" (default 64 => 1/64 kwartnoot)
    const minVarUser = getNumberParam(params, 0, 0);   // 0–10
    const maxVarUser = getNumberParam(params, 1, 10);  // 0–10

    // --- SAFETY CLAMPS ---

    // begrens gebruikersrange
    let minUser = Math.max(0, Math.min(10, minVarUser));
    let maxUser = Math.max(0, Math.min(10, maxVarUser));

    // zorg dat Max >= Min (anders onmogelijk gebied)
    if (maxUser < minUser) {
    const mid = (maxUser + minUser) * 0.5;
    minUser = mid;
    maxUser = mid;
    }
    const beatsPerMeasure = getNumberParam(params, 2, 4)
    const stepBeats = getNumberParam(params, 3, 1)
    const onsetMergeSubdivision = Math.max(
        1,
        Math.floor(getNumberParam(params, 4, 64))
    )

    // ---- Convert naar frames ----
    const beatFrames = framesPerQNote // 1 beat = 1 kwartnoot in jullie systeem
    const windowFrames = Math.round(beatsPerMeasure * beatFrames) // 1 maat
    const stepFrames = Math.round(stepBeats * beatFrames)

    // Tolerance voor "zelfde event"
    const toleranceFrames = Math.max(
        0,
        Math.round(framesPerQNote / onsetMergeSubdivision)
    )

    // ---- Score per voice, dan gemiddeld ----
const originalMelody = melody;

let total = 0;
let used = 0;

for (let v = 0; v < voices.length; v++) {
  if (!voices[v]) continue;

  // alleen deze voice selecteren via jullie bestaande voiceSplits logic
  const voiceMask: [boolean, boolean, boolean] = [
  v === 0,
  v === 1,
  v === 2,
];
  const m = limitMelody(originalMelody, voiceSplits, voiceMask);
  if (m.length === 0) continue;

  const events = extractOnsetEventsMerged(m, toleranceFrames);
  if (events.length < 2 || windowFrames <= 0 || stepFrames <= 0) continue;

  const rangeStart = 0;
  const rangeEnd = events[events.length - 1] + windowFrames;

  const energy = computeEnergySeries(events, windowFrames, stepFrames, rangeStart, rangeEnd);
  if (energy.length < 2) continue;

  const ratios = computeRatios(energy, 1);

  const { score } = scoreRatiosWithBoundaries(
    energy,
    ratios,
    minUser,   // 0..10
    maxUser,   // 0..10
    m.length   // <-- notesCount per voice voor "potentie"
  );

  total += score;
  used++;
}

if (used === 0) {
  return null;
}

return { score: total / used, info: [] };
}
