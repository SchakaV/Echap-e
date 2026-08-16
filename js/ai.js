// ai.js — heuristique de choix de case pour les coureurs IA.
//
// La signature `aiChooseCell(state, rider, cells)` est conservée : la même
// fonction sert le mode solo/hotseat (race-loop.js) et le serveur multijoueur
// (server.js). `cells` est la liste des cases atteignables renvoyées par
// `resolveTarget` : chacune vaut { column, lane, path }.
//
// Philosophie : maximiser la progression avant tout (les cases candidates
// utilisent déjà toutes le même nombre de pas), puis départager au moyen
// d'une note composite qui tient compte de l'aspiration, de la protection
// contre le vent entre coéquipiers, du dégagement de la voie, du terrain
// favorable à la spécialité du coureur et de l'approche du sprint final.

import { terrainAt } from './board.js';

/** Trouve un coureur par son id dans l'état. */
function findRiderById(state, id) {
  return state.riders.find(r => r.id === id);
}

/** Renvoie l'id du coureur occupant une case, ou null. */
function occupantId(state, column, lane) {
  return state.occupancy.get(`${column}-${lane}`) || null;
}

/** Vrai si la case (colonne, voie) est libre (hors piste → libre). */
function isFree(state, column, lane) {
  if (lane < 0 || lane >= state.board.width) return false;
  return !state.occupancy.has(`${column}-${lane}`);
}

/**
 * Compte combien de cases consécutives sont libres devant la case cible,
 * sur la même voie. Une voie « ouverte » permet de continuer à progresser
 * ensuite sans rebouchon immédiat.
 */
function clearRunAhead(state, column, lane, max = 6) {
  let run = 0;
  for (let c = column + 1; c < state.finishColumn && run < max; c++) {
    if (!isFree(state, c, lane)) break;
    run++;
  }
  return run;
}

/**
 * Heuristique d'évaluation d'une case candidate pour un coureur donné.
 * Plus c'est haut, mieux c'est. La progression (colonne) pèse beaucoup plus
 * lourd que les autres critères : on ne sacrifie jamais de la distance pour
 * un détail tactique, sauf cas extrême d'égalité parfaite.
 */
function scoreCell(state, rider, cell) {
  const { column, lane } = cell;
  const finishColumn = state.finishColumn;
  const board = state.board;
  const spec = rider.spec || {};

  let score = 0;

  // --- 1) Progression : la colonne atteinte. Écrasant. ---
  // On l'amplifie (×1000) pour qu'aucune somme de bonus tactiques ne
  // puisse faire pencher la balance contre une case plus avancée.
  score += column * 1000;

  // Franchir la ligne est le meilleur résultat possible.
  if (column >= finishColumn) score += 1_000_000;

  // --- 2) Aspiration : +1 au prochain jet si un coureur est juste devant,
  //     même voie (cf. updateDraftBonuses). ---
  const aheadId = occupantId(state, column + 1, lane);
  if (aheadId) {
    score += 60;
    const ahead = findRiderById(state, aheadId);
    // Protection contre le vent : derrière un COÉQUIPIER, on engrange un
    // compteur qui devient +1 supplémentaire après 2 manches consécutives.
    // C'est donc plus précieux qu'une aspiration derrière un rival.
    if (ahead && ahead.teamId === rider.teamId) {
      score += 40;
      // Plus le coéquipier est avancé, plus il « tire » le groupe vers
      // l'avant : rester dans sa roue vaut mieux.
      score += Math.min(8, ahead.column - column) * 2;
    }
  } else {
    // Pas d'aspiration possible ici : léger coût d'opportunité, mais la
    // voie dégagée compense en partie (voir point 3).
    score -= 10;
  }

  // --- 3) Dégagement de la voie : capacité à avancer au prochain tour sans
  //     être immédiatement bloqué. On sonde quelques cases devant. ---
  const run = clearRunAhead(state, column, lane, 6);
  score += run * 8;
  // Une voie totalement murée juste devant est pénalisée, sauf si l'on est
  // à portée de franchir la ligne.
  if (run === 0 && column < finishColumn) score -= 25;

  // --- 4) Stabilité : garder sa voie évite les zigzags (perte de demi-case
  //     au prochain jet) et préserve les bonus déjà en place. ---
  if (lane === rider.lane) score += 20;

  // --- 5) Terrain favorable à la spécialité. Le terrain SOUS la case finale
  //     détermine le bonus du prochain jet, pas celui en cours. Un coureur
  //     a donc intérêt à finir son déplacement sur un terrain qu'il aime. ---
  const terrain = terrainAt(board, column);
  const tb = (spec.terrainBonus && spec.terrainBonus[terrain]) || 0;
  // En contre-la-montre, le baroudeur gagne un bonus de plaine à la place de
  // son bonus d'échappée : l'IA le pousse donc à viser la plaine.
  const ttBonus = (state.isTimeTrial && spec.ttPlaineBonus && terrain === 'plaine') ? spec.ttPlaineBonus : 0;
  if (tb > 0) score += tb * 15;
  if (tb < 0) score += tb * 30; // pénalité aggravée (ex. sprinteur en montagne)
  if (ttBonus > 0) score += ttBonus * 15;

  // --- 6) Sprinteur : à l'approche de la ligne, la priorité absolue est de
  //     dégager une voie franche vers l'arrivée pour enchaîner le bonus de
  //     sprint. On récompense la perspective d'arrivée imminente. ---
  if (spec.sprintBonus) {
    const distToLine = finishColumn - column;
    if (distToLine > 0 && distToLine <= 6) {
      // Plus on est proche, plus il faut une voie ouverte : le bonus de
      // sprint ne sert à rien si l'on reste bloqué juste avant la ligne.
      score += (6 - distToLine) * 12;
      score += run * 6;
    }
  }

  // --- 7) Baroudeur en échappée : si l'on est déjà seul en tête, toute case
  //     qui maintient l'écart ou l'agrandit est bonne. La progression maximale
  //     est déjà privilégiée par le score de colonne ; on ajoute juste un
  //     bonus pour « garder le cap » plutôt que de zigzaguer pour chercher
  //     une aspiration qui n'existe pas (personne devant). ---
  // En contre-la-montre, le baroudeur n'a plus de bonus d'échappée — on ne
  // le pousse donc pas à maintenir un écart de tête artificiellement.
  if (spec.breakawayBonus && !aheadId && !state.isTimeTrial) {
    score += 25;
  }

  // --- 8) Esprit d'équipe : éviter de « sauter » un coéquipier qui nous
  //     abrite, sauf si l'on peut réellement progresser. Concrètement, si un
  //     coéquipier est juste devant (aspiration + vent), on valorise rester
  //     dans son sillage plutôt que de changer de voie pour une aspiration
  //     marginale chez un rival. Le bonus coéquipier (point 2) gère déjà
  //     l'essentiel ; ici on pénalise juste de quitter la roue d'un
  //     coéquipier pour une voie sans aspirateur. ---
  if (rider.draftBonus && rider.teammateDraftStreak > 0) {
    if (lane !== rider.lane && !aheadId) score -= 15;
  }

  return score;
}

/**
 * Choisit une case parmi les options atteignables (peuvent être à des
 * colonnes différentes, puisqu'une diagonale avance moins qu'une ligne
 * droite). L'IA privilégie la meilleure progression, puis la case la plus
 * dégagée et tactiquement favorable pour la suite (aspiration, protection
 * du vent, terrain adapté à la spécialité, approche du sprint final).
 *
 * Une petite part d'aléatoire (±3) est ajoutée pour éviter que des IA au
 * profil identique ne jouent de façon déterministe et robotique, tout en
 * restant négligeable devant les écarts de score réels.
 */
export function aiChooseCell(state, rider, cells) {
  if (cells.length === 1) return cells[0];

  const scored = cells.map(c => ({
    cell: c,
    score: scoreCell(state, rider, c) + (Math.random() - 0.5) * 6,
  }));
  scored.sort((a, b) => b.score - a.score);

  // Parmi les ex æquo du meilleur score, on tire au hasard pour varier.
  const best = scored[0].score;
  const tops = scored.filter(s => s.score >= best - 0.01).map(s => s.cell);
  if (tops.length === 1) return tops[0];
  return tops[Math.floor(Math.random() * tops.length)];
}

// Ré-export des utilitaires internes (utiles pour d'éventuels tests).
export const __test = { scoreCell, clearRunAhead, isFree };
