// groups.js — système de groupes de course (échappée, poursuivants,
// retardataires, peloton) pour les courses NORMALES uniquement.
//
// En contre-la-montre (individuel ou par équipe), il n'y a ni peloton ni
// groupe : on n'appelle jamais ces fonctions (voir race-render.js /
// engine.js). Ce module ne contient donc que de la logique « course
// normale ».
//
// Définition d'un groupe : ensemble de coureurs séparés du groupe
// précédent (plus avancé) par PLUS de GROUP_SPLIT_GAP cases d'écart. Deux
// coureurs à 4 cases d'écart ou moins appartiennent donc au même groupe ;
// il faut 5 cases d'écart ou plus pour former deux groupes distincts.

/**
 * Seuil (en cases d'écart) au-delà duquel deux ensembles de coureurs sont
 * considérés comme DEUX groupes distincts : il faut PLUS de 4 cases d'écart
 * entre le coureur le plus avancé du groupe arrière et le moins avancé du
 * groupe de devant (donc un écart de 5 cases ou plus).
 *
 * Utilisé à la fois pour la formation des groupes (computeGroups) et pour
 * le bonus de baroudeur « en tête d'un groupe », afin de garder une
 * définition unique et cohérente du passage d'un groupe à l'autre.
 */
export const GROUP_SPLIT_GAP = 4; // écart STRICTEMENT supérieur à cette valeur sépare 2 groupes

/**
 * Construit la liste des groupes de coureurs d'une course (cours normales
 * uniquement — en contre-la-montre il n'y a ni peloton ni groupe).
 *
 * Algorithme :
 *  1. On prend les coureurs non arrivés ayant une position valide, triés
 *     par colonne décroissante (du plus avancé au moins avancé).
 *  2. On les parcourt ; un nouveau groupe démarre dès que l'écart entre
 *     le coureur courant et le précédent (plus avancé) est STRICTEMENT
 *     supérieur à GROUP_SPLIT_GAP (donc ≥ 5 cases d'écart).
 *  3. On étiquette ensuite chaque groupe selon sa position :
 *     - le groupe contenant le PLUS de coureurs (et, en cas d'égalité,
 *       le plus avancé) est le PELÔTON ;
 *     - le groupe de TÊTE (plus avancé) est l'ÉCHAPPÉE ;
 *     - les groupes entre l'échappée et le peloton sont les POURSUIVANTS,
 *       numérotés à partir du plus proche de l'échappée (poursuivant 1,
 *       2, ...) ;
 *     - les groupes derrière le peloton sont les RETARDATAIRES, numérotés
 *       à partir du plus proche du peloton (retardataire 1, 2, ...).
 *
 * Quand le peloton est aussi le groupe de tête (ex. début de course, tout
 * le monde groupé), il n'y a qu'un seul groupe « peloton » et aucune
 * échappée.
 *
 * Renvoie un tableau de groupes, du plus avancé (tête) au moins avancé,
 * chacun étant :
 *   { id, riders: [riderId, ...], count, minColumn, maxColumn,
 *     type: 'echappee'|'poursuivant'|'peloton'|'retardataire',
 *     rank: number|null, headIds: [riderId, ...] }
 * `rank` vaut null pour le peloton et l'échappée ; sinon 1, 2, ... selon
 * le type (poursuivant 1 = le plus proche de l'échappée ; retardataire 1
 * = le plus proche du peloton). `headIds` liste les coureurs ex aequo en
 * tête du groupe (column === maxColumn).
 */
export function computeGroups(state) {
  const active = state.riders
    .filter(r => !r.finished && r.column !== null && r.column !== undefined)
    .sort((a, b) => b.column - a.column);
  if (!active.length) return [];

  // 1) Découpage en blocs selon l'écart avec le coureur précédent (plus
  //    avancé). On regroupe tant que l'écart est <= GROUP_SPLIT_GAP.
  const blocks = [];
  let current = [active[0]];
  for (let i = 1; i < active.length; i++) {
    const prev = active[i - 1];
    const cur = active[i];
    if (prev.column - cur.column > GROUP_SPLIT_GAP) {
      blocks.push(current);
      current = [cur];
    } else {
      current.push(cur);
    }
  }
  blocks.push(current);

  // 2) Identification du peloton : le groupe le plus gros ; en cas
  //    d'égalité d'effectif, le plus avancé (maxColumn le plus grand).
  let pelotonIdx = 0;
  for (let i = 1; i < blocks.length; i++) {
    if (blocks[i].length > blocks[pelotonIdx].length
      || (blocks[i].length === blocks[pelotonIdx].length
        && Math.max(...blocks[i].map(r => r.column)) > Math.max(...blocks[pelotonIdx].map(r => r.column)))) {
      pelotonIdx = i;
    }
  }

  // 3) Étiquetage. blocks est déjà trié du plus avancé (idx 0) au moins
  //    avancé (dernier idx). Le peloton est identifié à l'étape 2.
  //    - le bloc de TÊTE (idx 0), s'il n'est pas le peloton, est l'ÉCHAPPÉE ;
  //    - les blocs entre l'échappée et le peloton sont les POURSUIVANTS,
  //      numérotés à partir du plus proche de l'échappée (poursuivant 1) ;
  //    - le peloton ;
  //    - les blocs derrière le peloton sont les RETARDATAIRES, numérotés
  //      à partir du plus proche du peloton (retardataire 1).
  //    Si tout le monde est groupé, il n'y a qu'un seul bloc = peloton
  //    (pas d'échappée).
  const headIsPeloton = pelotonIdx === 0;
  const groups = blocks.map((block, idx) => {
    const columns = block.map(r => r.column);
    const maxColumn = Math.max(...columns);
    const minColumn = Math.min(...columns);
    let type;
    let rank = null;
    if (idx === pelotonIdx) {
      type = 'peloton';
    } else if (idx === 0) {
      // Bloc de tête distinct du peloton : c'est l'échappée.
      type = 'echappee';
    } else if (idx < pelotonIdx) {
      // Entre l'échappée et le peloton : poursuivant. Les blocs sont
      // ordonnés de l'échappée (idx 0) vers le peloton, donc poursuivant 1
      // = bloc juste après l'échappée (le plus proche de l'échappée).
      type = 'poursuivant';
      rank = idx; // idx 1 -> poursuivant 1, idx 2 -> poursuivant 2, ...
    } else {
      // Derrière le peloton : retardataire. Retardataire 1 = bloc juste
      // derrière le peloton (le plus proche du peloton).
      type = 'retardataire';
      rank = idx - pelotonIdx;
    }
    return {
      id: idx,
      riders: block.map(r => r.id),
      count: block.length,
      minColumn,
      maxColumn,
      type,
      rank,
      headIds: block.filter(r => r.column === maxColumn).map(r => r.id),
    };
  });

  return groups;
}

/**
 * Indique si un coureur est « en tête » de son groupe (le plus avancé,
 * ex aequo possible) ET que son groupe est un groupe de poursuivants ou de
 * retardataires (donc un groupe intermédiaire, ni l'échappée ni le
 * peloton) comptant au moins 2 coureurs. Sert au bonus « faire rouler le
 * groupe » du baroudeur en course normale.
 *
 * Renvoie le groupe dont le coureur est en tête, ou null s'il n'est pas
 * en tête d'un groupe éligible (échappée, peloton, groupe solo, ou pas en
 * tête).
 */
export function headOfPursuitOrLaggardGroup(state, rider) {
  if (state.isTimeTrial || rider.finished || rider.column === null || rider.column === undefined) {
    return null;
  }
  const groups = computeGroups(state);
  for (const g of groups) {
    if (g.type !== 'poursuivant' && g.type !== 'retardataire') continue;
    if (g.count < 2) continue;
    if (!g.riders.includes(rider.id)) continue;
    if (g.headIds.includes(rider.id)) return g;
  }
  return null;
}
