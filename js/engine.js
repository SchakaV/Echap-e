// engine.js — cœur du moteur de course

import { terrainAt, isSprintZone } from './board.js';

function roll1d6() {
  return Math.floor(Math.random() * 6) + 1;
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

function buildOccupancy(board, riders) {
  const map = new Map();
  riders.forEach(r => {
    if (!r.finished) map.set(`${r.column}-${r.lane}`, r.id);
  });
  return map;
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

  const baseTotal = Math.max(1, roll + terrainBonus + breakawayBonus + draftBonus);

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
    breakawayBonus, inBreakaway, draftBonus, total,
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

export function resolveTarget(state, rider, total) {
  const width = state.board.width;
  const finishColumn = state.finishColumn;

  const isFree = (c, l) => isFreeCell(state.occupancy, c, l);

  // frontière = ensemble des (colonne, voie) atteignables avec EXACTEMENT s pas,
  // chaque entrée gardant le chemin (liste de cases) parcouru pour y arriver —
  // utile pour animer le déplacement case par case.
  let frontier = new Map([[
    cellKey(rider.column, rider.lane),
    { column: rider.column, lane: rider.lane, path: [] },
  ]]);
  let lastFrontier = frontier;
  let stepsUsed = 0;

  for (let s = 1; s <= total; s++) {
    const next = new Map();
    const addCandidate = (c, l, fromPath) => {
      if (l < 0 || l >= width) return;
      const finishing = c >= finishColumn;
      if (!finishing && !isFree(c, l)) return;
      const col = finishing ? finishColumn : c;
      const key = cellKey(col, l);
      if (!next.has(key)) next.set(key, { column: col, lane: l, path: [...fromPath, { column: col, lane: l }] });
    };

    frontier.forEach(({ column, lane, path }) => {
      if (column >= finishColumn) {
        // déjà sur la ligne : reste figé, les pas restants ne servent plus à rien
        next.set(cellKey(column, lane), { column, lane, path });
        return;
      }
      addCandidate(column + 1, lane, path); // tout droit
      const diag = diagonalColumnDelta(lane);
      addCandidate(column + diag, lane - 1, path); // diagonale gauche
      addCandidate(column + diag, lane + 1, path); // diagonale droite
    });

    if (next.size === 0) break;
    frontier = next;
    lastFrontier = next;
    stepsUsed = s;
  }

  const cells = Array.from(lastFrontier.values());
  const finishing = cells.some(c => c.column >= finishColumn);
  const blocked = stepsUsed < total;

  let finalCells = cells;
  if (finishing) {
    const finishEntry = cells.find(c => c.column >= finishColumn) || { column: finishColumn, lane: rider.lane, path: [] };
    finalCells = [{ column: finishColumn, lane: finishEntry.lane, path: finishEntry.path }];
  }

  return {
    cells: finalCells,
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

/** Recalcule les bonus d'aspiration pour le prochain tour, une fois tous les déplacements du round faits. */
/** Recalcule les bonus d'aspiration pour le prochain tour, une fois tous les
 *  déplacements du round faits. Seul le coureur qui se trouve DERRIÈRE un
 *  autre (même voie, case juste devant occupée) bénéficie du bonus — celui
 *  qui est devant n'en profite jamais. */
export function updateDraftBonuses(state) {
  for (const rider of state.riders) {
    if (rider.finished) continue;
    const aheadCell = `${rider.column + 1}-${rider.lane}`;
    rider.draftBonus = state.occupancy.has(aheadCell) ? 1 : 0;
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
