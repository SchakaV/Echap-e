// engine.js — cœur du moteur de course

import { terrainAt, isSprintZone } from './board.js';

function roll1d6() {
  return Math.floor(Math.random() * 6) + 1;
}

function buildOccupancy(board, riders) {
  const map = new Map();
  riders.forEach(r => {
    if (!r.finished) map.set(`${r.column}-${r.lane}`, r.id);
  });
  return map;
}

/**
 * Crée l'état d'un contre-la-montre : les coureurs ne sont PAS placés tout
 * de suite (contrairement à une course normale) — ils s'élancent un par un,
 * un nouveau par manche, dans l'ordre de `startOrder`. Chaque coureur garde
 * en mémoire sa manche de départ personnelle (rider.startRound), utile pour
 * calculer son temps réel (nombre de manches courues) une fois arrivé,
 * puisque tout le monde ne part pas à la même manche.
 */
export function createTimeTrialState(board, riders, startOrder) {
  riders.forEach(r => {
    r.column = null;
    r.lane = null;
    r.draftBonus = 0;
    r.finished = false;
    r.finishRound = null;
    r.finishRank = null;
    r.arrivedRound = 0;
    r.arrivedSeq = 0;
    r.teammateDraftStreak = 0;
    r.startRound = null;
  });

  return {
    board,
    riders,
    round: 0,
    moveSeq: 0,
    finishColumn: board.length,
    log: [],
    occupancy: new Map(),
    finishedCount: 0,
    isTimeTrial: true,
    ttStartOrder: startOrder,
    ttNextStartIdx: 0,
  };
}

/**
 * Fait s'élancer le prochain coureur de la liste de départ du contre-la-
 * montre, s'il en reste — placé au départ (colonne 0) sur la première voie
 * libre. Renvoie le coureur qui vient de s'élancer, ou null s'il n'y en a
 * plus (ou pas de voie libre ce tour-ci, très rare).
 */
export function introduceNextTTRider(state) {
  if (state.ttNextStartIdx >= state.ttStartOrder.length) return null;
  const rider = state.ttStartOrder[state.ttNextStartIdx];

  let lane = -1;
  for (let l = 0; l < state.board.width; l++) {
    if (isFreeCell(state.occupancy, 0, l)) { lane = l; break; }
  }
  if (lane === -1) return null; // toutes les voies occupées au départ, on réessaiera la manche suivante

  state.ttNextStartIdx++;
  rider.column = 0;
  rider.lane = lane;
  rider.startRound = state.round;
  state.moveSeq++;
  rider.arrivedRound = state.round;
  rider.arrivedSeq = state.moveSeq;
  state.occupancy.set(cellKey(0, lane), rider.id);
  return rider;
}

/** Nombre de manches personnellement courues par un coureur arrivé (son
 *  vrai "temps"), puisque tous ne partent pas à la même manche. */
export function personalRounds(rider) {
  if (rider.startRound === null || rider.finishRound === null) return null;
  return rider.finishRound - rider.startRound + 1;
}

/** true une fois que tous les coureurs sont partis ET arrivés. */
export function allTTFinished(state) {
  return state.ttNextStartIdx >= state.ttStartOrder.length && state.riders.every(r => r.finished);
}

/** Classement final d'un contre-la-montre : au temps personnel (nombre de
 *  manches courues), le plus petit gagne — impossible de classer au fil de
 *  l'eau puisque les coureurs ne partent pas tous à la même manche. À
 *  n'appeler qu'une fois `allTTFinished` vrai. */
export function rankTimeTrialResults(state) {
  const sorted = [...state.riders].sort((a, b) => personalRounds(a) - personalRounds(b));
  sorted.forEach((r, i) => { r.finishRank = i + 1; });
}

/** Ordre de traitement d'une manche de contre-la-montre : uniquement les
 *  coureurs déjà partis (les autres attendent leur tour de s'élancer). */
export function ttRoundOrder(state) {
  return state.riders
    .filter(r => r.column !== null && !r.finished)
    .sort((a, b) =>
      b.column - a.column ||
      a.arrivedSeq - b.arrivedSeq ||
      a.lane - b.lane
    );
}

/**
 * Crée l'état de course. Les coureurs doivent déjà avoir une position
 * (column/lane) valide — voir la phase de placement dans main.js — car ils
 * démarrent dans la zone de départ (colonnes négatives) et non tous sur la
 * même case.
 */
export function createRaceState(board, riders) {
  riders.forEach(r => {
    r.draftBonus = 0;
    r.finished = false;
    r.finishRound = null;
    r.finishRank = null;
    r.arrivedRound = 0;
    r.arrivedSeq = 0;
    r.teammateDraftStreak = 0;
    r.startRound = null;
  });

  return {
    board,
    riders,
    round: 0,
    moveSeq: 0,
    finishColumn: board.length,
    log: [],
    occupancy: buildOccupancy(board, riders),
    finishedCount: 0,
  };
}

export function isFreeCell(occupancy, column, lane) {
  return !occupancy.has(`${column}-${lane}`);
}

export function freeLanesIn(occupancy, width, column) {
  const lanes = [];
  for (let l = 0; l < width; l++) {
    if (isFreeCell(occupancy, column, l)) lanes.push(l);
  }
  return lanes;
}

function nearestRivalGapBehind(state, rider) {
  let minGap = Infinity;
  for (const other of state.riders) {
    if (other.id === rider.id || other.finished) continue;
    if (other.column < rider.column) {
      const gap = rider.column - other.column;
      if (gap < minGap) minGap = gap;
    }
  }
  return minGap;
}

/**
 * Calcule le jet de dé + tous les bonus applicables à un coureur
 * pour SA position actuelle (avant déplacement).
 */
export function computeRoll(state, rider) {
  let roll = roll1d6();
  let rerolled = false;
  if (rider.spec.rerollOnOne && roll === 1) {
    roll = roll1d6();
    rerolled = true;
  }

  const terrain = terrainAt(state.board, rider.column);
  const terrainBonus = rider.spec.terrainBonus[terrain] || 0;

  let breakawayBonus = 0;
  let inBreakaway = false;
  if (rider.spec.breakawayBonus) {
    const gap = nearestRivalGapBehind(state, rider);
    const isLeaderish = rider.column === Math.max(...state.riders.filter(r => !r.finished).map(r => r.column));
    if (gap >= 4 && isLeaderish) {
      breakawayBonus = rider.spec.breakawayBonus;
      inBreakaway = true;
    }
  }

  const draftBonus = rider.draftBonus || 0;

  // Protection contre le vent : à partir de 2 manches d'affilée dans la
  // roue d'un coéquipier (pas un rival), un coéquipier dévoué abrite
  // davantage — bonus distinct de l'aspiration normale, qui lui ne demande
  // qu'une seule manche derrière n'importe qui.
  const windBonus = (rider.teammateDraftStreak || 0) >= 2 ? 1 : 0;

  const baseTotal = Math.max(1, roll + terrainBonus + breakawayBonus + draftBonus + windBonus);

  // Sprint final : ce n'est pas un bonus permanent une fois dans la zone,
  // mais un "coup de reins" — si le jet (avec les autres bonus déjà
  // appliqués) suffit à faire arriver le coureur dans les 4 dernières
  // cases, un sprinteur peut alors avancer de 3 cases de plus. S'il reste
  // bloqué avant d'atteindre la zone, le bonus ne se déclenche pas.
  let sprintBonus = 0;
  if (rider.spec.sprintBonus) {
    const preview = resolveTarget(state, rider, baseTotal);
    const reachesSprintZone = preview.finishing || preview.cells.some(c => isSprintZone(state.board, c.column));
    if (reachesSprintZone) sprintBonus = rider.spec.sprintBonus;
  }

  const total = Math.max(1, baseTotal + sprintBonus);

  return {
    roll, rerolled, terrain, terrainBonus, sprintBonus,
    breakawayBonus, inBreakaway, draftBonus, windBonus, total,
  };
}

/**
 * Calcule les cases atteignables pour un déplacement de `total` points.
 *
 * Chaque point de dé = UN pas (un choix : tout droit, ou en diagonale),
 * et non une case franchie. À cause du pavage décalé d'une demi-case entre
 * deux voies contiguës :
 *   - un pas tout droit (même voie) fait avancer d'UNE case complète.
 *   - un pas en diagonale (voie voisine) ne fait avancer que d'UNE DEMI-case :
 *     depuis une voie "paire" (non décalée), le numéro de case ne change pas
 *     en changeant de voie (la voie voisine est déjà une demi-case devant) ;
 *     depuis une voie "impaire" (décalée), il faut avancer d'une case pour
 *     retrouver l'alignement.
 * Aller en diagonale fait donc perdre un peu de progression par rapport à
 * foncer tout droit — mais permet de contourner un peloton compact.
 * Le coureur doit utiliser l'intégralité de ses points s'il existe un
 * chemin libre ; sinon il s'arrête au nombre de pas maximal atteignable.
 */
function diagonalColumnDelta(fromLane) {
  return fromLane % 2 === 0 ? 0 : 1;
}

function cellKey(column, lane) {
  return `${column}-${lane}`;
}

/**
 * Calcule toutes les cases atteignables pour un déplacement de `total`
 * points, en explorant toutes les combinaisons tout droit / diagonale.
 * Chaque point de dé est un pas ; le coureur doit utiliser l'intégralité de
 * ses points s'il existe un chemin libre, sinon il s'arrête au nombre de
 * pas maximal atteignable (bouchon). Quand plusieurs cases restent
 * atteignables avec le même nombre de pas, elles sont toutes proposées au
 * choix (par exemple pour contourner un peloton par la gauche ou la
 * droite).
 *
 * Quand une même case est atteignable par plusieurs chemins différents, le
 * chemin conservé (pour l'animation) est le plus direct — celui qui
 * comporte le moins de pas en diagonale — plutôt qu'un chemin qui
 * zigzaguerait inutilement pour l'atteindre.
 */
export function resolveTarget(state, rider, total) {
  const width = state.board.width;
  const finishColumn = state.finishColumn;
  const isFree = (c, l) => isFreeCell(state.occupancy, c, l);

  // frontière = ensemble des (colonne, voie) atteignables avec EXACTEMENT s
  // pas ; chaque entrée garde le chemin le plus direct trouvé jusqu'ici
  // (le moins de diagonales) pour y arriver, utile pour l'animation.
  let frontier = new Map([[
    cellKey(rider.column, rider.lane),
    { column: rider.column, lane: rider.lane, path: [], diagCount: 0, reversals: 0, lastDir: 0 },
  ]]);

  // Meilleure case atteinte pour CHAQUE voie au fil de l'exploration : une
  // voie qui se bloque tôt (peloton compact) garde sa meilleure case
  // atteignable, même si d'autres voies, moins gênées, continuent d'avancer
  // avec les pas restants. Chaque voie propose ainsi sa propre "meilleure
  // offre", pas seulement celles qui partagent le maximum global.
  const bestByLane = new Map();
  const recordBest = (entry) => {
    const prev = bestByLane.get(entry.lane);
    if (!prev) { bestByLane.set(entry.lane, entry); return; }
    const prevFinishing = prev.column >= finishColumn;
    const entryFinishing = entry.column >= finishColumn;
    if (prevFinishing) return; // franchir la ligne est déjà le meilleur résultat possible pour cette voie
    if (entryFinishing) { bestByLane.set(entry.lane, entry); return; } // franchir la ligne prime toujours sur rester en course
    if (entry.path.length > prev.path.length
      || (entry.path.length === prev.path.length && entry.diagCount < prev.diagCount)) {
      bestByLane.set(entry.lane, entry);
    }
  };
  frontier.forEach(recordBest);

  for (let s = 1; s <= total; s++) {
    const next = new Map();
    const addCandidate = (c, l, fromPath, fromDiagCount, fromReversals, fromLastDir, isDiagonal, dir) => {
      if (l < 0 || l >= width) return;
      const finishing = c >= finishColumn;
      if (!finishing && !isFree(c, l)) return;
      const col = finishing ? finishColumn : c;
      const key = cellKey(col, l);
      const diagCount = fromDiagCount + (isDiagonal ? 1 : 0);
      const reversals = fromReversals + (isDiagonal && fromLastDir !== 0 && dir !== fromLastDir ? 1 : 0);
      const newLastDir = isDiagonal ? dir : fromLastDir;
      const existing = next.get(key);
      // Préfère le chemin avec le moins de diagonales, puis le moins de
      // changements de direction (pas de zigzag inutile pour l'animation).
      const better = !existing
        || diagCount < existing.diagCount
        || (diagCount === existing.diagCount && reversals < existing.reversals);
      if (better) {
        next.set(key, { column: col, lane: l, path: [...fromPath, { column: col, lane: l }], diagCount, reversals, lastDir: newLastDir });
      }
    };

    frontier.forEach(({ column, lane, path, diagCount, reversals, lastDir }) => {
      if (column >= finishColumn) {
        // déjà sur la ligne : reste figé, les pas restants ne servent plus à rien
        next.set(cellKey(column, lane), { column, lane, path, diagCount, reversals, lastDir });
        return;
      }
      addCandidate(column + 1, lane, path, diagCount, reversals, lastDir, false, 0); // tout droit
      const diag = diagonalColumnDelta(lane);
      addCandidate(column + diag, lane - 1, path, diagCount, reversals, lastDir, true, -1); // diagonale gauche
      addCandidate(column + diag, lane + 1, path, diagCount, reversals, lastDir, true, 1); // diagonale droite
    });

    if (next.size === 0) break;
    next.forEach(recordBest);
    frontier = next;
  }

  let cells = Array.from(bestByLane.values());
  const finishing = cells.some(c => c.column >= finishColumn);

  if (finishing) {
    const finishEntry = cells.find(c => c.column >= finishColumn);
    cells = [{ column: finishColumn, lane: finishEntry.lane, path: finishEntry.path }];
  } else {
    // N'offre le fait de rester sur place que si AUCUNE voie n'a pu avancer
    // du tout — sinon, ce n'est pas une vraie option, juste l'immobilité.
    const moved = cells.filter(c => c.path.length > 0);
    if (moved.length > 0) cells = moved;
  }

  const stepsUsed = Math.max(0, ...cells.map(c => c.path.length));
  const blocked = !finishing && stepsUsed < total;

  return {
    cells: cells.map(({ column, lane, path }) => ({ column, lane, path })),
    finishing,
    blocked,
    stepsUsed,
    rawSteps: total,
  };
}

/**
 * Applique le déplacement d'un coureur vers la case choisie (column, lane).
 */
export function applyMove(state, rider, column, lane, rollInfo) {
  const startColumn = rider.column;
  const startLane = rider.lane;
  state.occupancy.delete(cellKey(startColumn, startLane));

  if (column !== startColumn || lane !== startLane) {
    // Une case, c'est une position (colonne, voie) précise — à cause du
    // pavage décalé, changer de voie en diagonale change bien de case même
    // quand le numéro de colonne ne bouge pas. Toute case nouvellement
    // atteinte doit donc remettre ces compteurs à jour, quelle que soit la
    // voie, pour que l'ordre de jeu reflète correctement qui est arrivé en
    // premier — arrivedSeq au coup près (deux coureurs peuvent atteindre la
    // même case pendant la même manche, l'un avant l'autre dans l'ordre de
    // traitement : arrivedRound seul ne suffit pas à les départager).
    state.moveSeq++;
    rider.arrivedRound = state.round;
    rider.arrivedSeq = state.moveSeq;
  }

  rider.column = column;
  rider.lane = lane;

  if (column >= state.finishColumn) {
    rider.finished = true;
    rider.finishRound = state.round;
    // Marge de pas restants une fois la ligne franchie : sert à départager
    // les arrivées d'un même round (plus la marge est grande, plus l'arrivée
    // est franche).
    const minStepsNeeded = state.finishColumn - startColumn;
    rider._rawTarget = (rollInfo.total || 0) - minStepsNeeded;
    state.finishedCount++;
  } else {
    state.occupancy.set(cellKey(column, lane), rider.id);
  }
}

/** Recalcule les bonus d'aspiration pour le prochain tour, une fois tous les
 *  déplacements du round faits. Seul le coureur qui se trouve DERRIÈRE un
 *  autre (même voie, case juste devant occupée) bénéficie du bonus — celui
 *  qui est devant n'en profite jamais.
 *
 *  Calcule aussi la protection contre le vent : si c'est un COÉQUIPIER qui
 *  est juste devant, on incrémente un compteur de manches consécutives ;
 *  au bout de 2 manches d'affilée dans la roue d'un coéquipier, un bonus
 *  supplémentaire de +1 s'ajoute (distinct de l'aspiration normale). */
export function updateDraftBonuses(state) {
  for (const rider of state.riders) {
    if (rider.finished) continue;
    const aheadKey = `${rider.column + 1}-${rider.lane}`;
    const aheadRiderId = state.occupancy.get(aheadKey);
    rider.draftBonus = aheadRiderId ? 1 : 0;

    let behindTeammate = false;
    if (aheadRiderId) {
      const aheadRider = state.riders.find(r => r.id === aheadRiderId);
      behindTeammate = !!(aheadRider && aheadRider.teamId === rider.teamId);
    }
    rider.teammateDraftStreak = behindTeammate ? (rider.teammateDraftStreak || 0) + 1 : 0;
  }
}

/** Ordre de traitement du round :
 *  1) le coureur le plus avancé (colonne la plus haute) joue en premier ;
 *  2) à égalité de colonne, celui qui a atteint cette case en premier joue
 *     avant les autres — au coup près (arrivedSeq), pas seulement à la
 *     manche près, car deux coureurs peuvent converger sur la même case
 *     pendant la même manche, l'un avant l'autre dans l'ordre de traitement ;
 *  3) à égalité totale (par exemple au tout premier round, sur la grille de
 *     départ), l'ordre va de haut en bas — voie 0 en premier. */
export function roundOrder(state) {
  return state.riders
    .filter(r => !r.finished)
    .sort((a, b) =>
      b.column - a.column ||
      a.arrivedSeq - b.arrivedSeq ||
      a.lane - b.lane
    );
}

/** Attribution des rangs d'arrivée pour les coureurs ayant fini ce round. */
export function rankFinishersOfRound(state, finishersThisRound) {
  finishersThisRound
    .sort((a, b) => (b._rawTarget || 0) - (a._rawTarget || 0));
  const baseRank = state.riders.filter(r => r.finished && r.finishRound < state.round).length;
  finishersThisRound.forEach((r, i) => {
    r.finishRank = baseRank + i + 1;
  });
}

export function allFinished(state) {
  return state.riders.every(r => r.finished);
}
