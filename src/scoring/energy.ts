// src/scoring/energy.ts
import { Note, framesPerQNote } from '../notes/index.ts'
import { Param, ScoreInfo, ScoringsFunction } from './index.ts'
import { limitMelody } from './util.ts'

/**
 * ENERGY WAVES (ratio-based)
 *
 * Idee:
 * - We schuiven een window van 1 maat over de muziek (in frames).
 * - In elk window tellen we hoeveel "events" er zijn.
 * - Event = startmoment. Akkoorden tellen als 1 event (met tolerantie).
 * - We kijken NIET naar absolute aantallen, maar naar de verhouding tussen opeenvolgende windows:
 *      r = (E_next + eps) / (E_prev + eps)
 * - Gebruiker stelt een ondergrens (rLow) en bovengrens (rHigh) in.
 *   Buiten die band => penalty (spikey / bursts).
 *
 * Slimme uitzondering:
 * - Als E_prev == 0 of E_next == 0, zien we dat als phrase boundary (stilte/inzet),
 *   en straffen we die overgang NIET als spike.
 */

// ---------------------------------------------------------
// Param helper
// ---------------------------------------------------------
function getNumberParam(
    params: Param[],
    idx: number,
    fallback: number
): number {
    const v = params?.[idx]?.value
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

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
 * 4) Score de ratio’s met een band [rLow, rHigh].
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
    rLow: number,
    rHigh: number
): { score: number; info: ScoreInfo[] } {
    let penalty = 0

    const transitionsTotal = ratios.length
    let transitionsUsed = 0
    let boundariesSkipped = 0
    let outsideCount = 0

    for (let i = 0; i < ratios.length; i++) {
        const eA = energy[i]
        const eB = energy[i + 1]
        const r = ratios[i]

        // Phrase boundary: stilte ↔ inzet (of stilte ↔ stilte)
        if (eA === 0 || eB === 0) {
            boundariesSkipped++
            continue
        }

        transitionsUsed++

        if (r < rLow) {
            // hoe ver onder rLow -> hoe meer penalty
            penalty += (rLow - r) / rLow
            outsideCount++
        } else if (r > rHigh) {
            // hoe ver boven rHigh -> hoe meer penalty
            penalty += (r - rHigh) / rHigh
            outsideCount++
        }
    }

    // Raw score: hoger is beter. We gebruiken negatieve penalty.
    const rawScore = -penalty

    // info: jullie gebruiken vaak [], maar dit is handig voor debug.
    const info = [
        { name: 'penalty', value: '' + penalty },
        {
            name: 'outsideRate',
            value: '' + (transitionsUsed > 0 ? outsideCount / transitionsUsed : 0) ,
        },
        { name: 'boundariesSkipped', value: '' + boundariesSkipped },
        { name: 'transitionsTotal', value: '' + transitionsTotal },
        { name: 'transitionsUsed', value: '' + transitionsUsed },
    ]

    return { score: rawScore, info }
}

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
    // 0) rLow  : ondergrens verhouding
    // 1) rHigh : bovengrens verhouding
    // 2) beatsPerMeasure : maatlengte (default 4)
    // 3) stepBeats       : schuifstap (default 1 beat)
    // 4) onsetMergeSubdivision : "hoe strak is tegelijk?" (default 64 => 1/64 kwartnoot)
    const rLow = getNumberParam(params, 0, 0.8)
    const rHigh = getNumberParam(params, 1, 1.25)
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

    // ---- Events ----
    const events = extractOnsetEventsMerged(melody, toleranceFrames)
    if (events.length < 2 || windowFrames <= 0 || stepFrames <= 0) {
        return {
            score: -999,
            info: [
                { name: 'reason', value: 'too_few_events_or_bad_window' },
            ],
        }
    }

    // Range: start op 0 zodat measure-grid “netjes” is
    const rangeStart = 0
    const rangeEnd = events[events.length - 1] + windowFrames

    // ---- Energy per window ----
    const energy = computeEnergySeries(
        events,
        windowFrames,
        stepFrames,
        rangeStart,
        rangeEnd
    )
    if (energy.length < 2) {
        return {
            score: -999,
            info: [{ name: 'reason', value: 'energy_too_short' }],
        }
    }

    // ---- Ratios ----
    const ratios = computeRatios(energy, 1)

    // ---- Score ----
    const { score } = scoreRatiosWithBoundaries(energy, ratios, rLow, rHigh)

    // // Voeg wat handige param-info toe (optioneel)
    // const extraInfo = [
    //     // { name: "rLow", value: rLow },
    //     // { name: "rHigh", value: rHigh },
    //     // { name: "beatsPerMeasure", value: beatsPerMeasure },
    //     // { name: "stepBeats", value: stepBeats },
    //     // { name: "onsetMergeSubdivision", value: onsetMergeSubdivision },
    //     // { name: "toleranceFrames", value: toleranceFrames },
    // ]

    return { score, info: []}
}
