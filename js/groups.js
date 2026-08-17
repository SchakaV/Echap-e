// groups.js — système de groupes de course (échappée, poursuivants,
// retardataires, peloton) pour les courses NORMALES uniquement.
//
// En contre-la-montre (individuel ou par équipe), il n'y a ni peloton ni
// groupe : on n'appelle jamais ces fonctions (voir race-render.js / engine.js).
// Ce module ne contient donc que de la logique « course normale ».
//
// Définition d'un groupe : ensemble de coureurs séparés du groupe
// précédent (plus avancé) par PLUS de GROUP_SPLIT_GAP cases d'écart. Deux
// coureurs à 3 cases d'écart ou moins appartiennent donc au même groupe ;
// il faut 4 cases d'écart ou plus pour former deux groupes distincts.

/**
 * Seuil (en cases d'écart) au-delà duquel deux ensembles de coureurs sont
 * considérés comme DEUX groupes distincts : il faut PLUS de 3 cases d'écart
 * entre le coureur le plus avancé du groupe arrière et le moins avancé du
 * groupe de devant (donc un écart de 4 cases ou plus).
 *
 * Utilisé à la fois pour la formation des groupes (computeGroups) et pour
 * le bonus de baroudeur « en tête d'un groupe », afin de garder une
 * définition unique et cohérente du passage d'un groupe à l'autre.
 */
export const GROUP_SPLIT_GAP = 3;

/**
 * Construit la liste des groupes de coureurs d'une course
 * (courses normales uniquement — en contre-la-montre il n'y a ni peloton
 * ni groupe).
 *
 * Algorithme :
 *
 * 1. On prend les coureurs non arrivés ayant une position valide, triés
 *    par colonne décroissante (du plus avancé au moins avancé).
 *
 * 2. On les parcourt ; un nouveau groupe démarre dès que l'écart entre
 *    le coureur courant et le précédent (plus avancé) est STRICTEMENT
 *    supérieur à GROUP_SPLIT_GAP.
 *
 * 3. AVANT que la moitié des coureurs ait terminé :
 *      - le groupe principal est le PELÔTON ;
 *      - le groupe de tête distinct est l'ÉCHAPPÉE ;
 *      - les groupes entre l'échappée et le peloton sont les POURSUIVANTS ;
 *      - les groupes derrière le peloton sont les RETARDATAIRES.
 *
 * 4. À PARTIR DU MOMENT où la moitié des coureurs ont terminé :
 *      - tous les groupes encore en course sont des RETARDATAIRES ;
 *      - ils sont numérotés à partir du groupe le plus avancé.
 *
 * Renvoie un tableau de groupes, du plus avancé (tête) au moins avancé,
 * chacun étant :
 *
 *   {
 *     id,
 *     riders: [riderId, ...],
 *     count,
 *     minColumn,
 *     maxColumn,
 *     type: 'echappee'|'poursuivant'|'peloton'|'retardataire',
 *     rank: number|null,
 *     headIds: [riderId, ...]
 *   }
 */
export function computeGroups(state) {
  const active = state.riders
    .filter(r => !r.finished && r.column !== null && r.column !== undefined)
    .sort((a, b) => b.column - a.column);

  if (!active.length) return [];

  // 1) Découpage en blocs selon l'écart avec le coureur précédent
  //    (plus avancé).
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

  // -----------------------------------------------------------------------
  // NOUVELLE RÈGLE :
  //
  // Une fois que la moitié des coureurs ont franchi la ligne d'arrivée,
  // tous les groupes encore en course deviennent des groupes de
  // retardataires.
  //
  // Exemple : 20 coureurs
  //   finishedCount < 10 -> classement normal des groupes
  //   finishedCount >= 10 -> tous les groupes restants = retardataires
  // -----------------------------------------------------------------------

  const totalRiders = state.riders.length;
  const halfReached = state.finishedCount >= Math.ceil(state.riders.length / 2);

  if (halfReached) {
    return blocks.map((block, idx) => {
      const columns = block.map(r => r.column);
      const maxColumn = Math.max(...columns);
      const minColumn = Math.min(...columns);

      return {
        id: idx,
        riders: block.map(r => r.id),
        count: block.length,
        minColumn,
        maxColumn,
        type: 'retardataire',
        rank: idx + 1,
        headIds: block
          .filter(r => r.column === maxColumn)
          .map(r => r.id),
      };
    });
  }

  // -----------------------------------------------------------------------
  // AVANT LA MOITIÉ DES ARRIVÉES :
  // fonctionnement normal des groupes.
  // -----------------------------------------------------------------------

  // Identification du peloton :
  // le groupe le plus gros ; en cas d'égalité d'effectif, le plus avancé.
  let pelotonIdx = 0;

  for (let i = 1; i < blocks.length; i++) {
    if (
      blocks[i].length > blocks[pelotonIdx].length ||
      (
        blocks[i].length === blocks[pelotonIdx].length &&
        Math.max(...blocks[i].map(r => r.column)) >
        Math.max(...blocks[pelotonIdx].map(r => r.column))
      )
    ) {
      pelotonIdx = i;
    }
  }

  // Étiquetage :
  //
  // - bloc de tête distinct du peloton = échappée
  // - blocs entre échappée et peloton = poursuivants
  // - peloton
  // - blocs derrière le peloton = retardataires

  const groups = blocks.map((block, idx) => {
    const columns = block.map(r => r.column);
    const maxColumn = Math.max(...columns);
    const minColumn = Math.min(...columns);

    let type;
    let rank = null;

    if (idx === pelotonIdx) {
      type = 'peloton';
    } else if (idx === 0) {
      type = 'echappee';
    } else if (idx < pelotonIdx) {
      type = 'poursuivant';
      rank = idx;
    } else {
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
      headIds: block
        .filter(r => r.column === maxColumn)
        .map(r => r.id),
    };
  });

  return groups;
}

/**
 * Retourne le groupe auquel appartient un coureur.
 */
export function groupOfRider(state, rider) {
  if (
    state.isTimeTrial ||
    rider.finished ||
    rider.column === null ||
    rider.column === undefined
  ) {
    return null;
  }

  const groups = computeGroups(state);

  return groups.find(g => g.riders.includes(rider.id)) || null;
}

/**
 * Indique si un coureur est en tête d'un groupe de poursuivants.
 *
 * Ce fonctionnement est utilisé pour le bonus :
 *
 *   « roule sur l'échappée » = +1
 *
 * Le coureur doit :
 *   - être un baroudeur ;
 *   - appartenir à un groupe de poursuivants ;
 *   - être en tête de ce groupe.
 */
export function headOfPursuitGroup(state, rider) {
  const group = groupOfRider(state, rider);

  if (!group) return null;

  if (group.type !== 'poursuivant') return null;

  if (group.count < 2) return null;

  if (!group.headIds.includes(rider.id)) return null;

  return group;
}

/**
 * Retourne le groupe de retardataires auquel appartient le coureur.
 *
 * Contrairement à l'ancien système, le baroudeur n'a PAS besoin d'être
 * en tête du groupe.
 *
 * Dès qu'au moins un baroudeur appartient à ce groupe, celui-ci bénéficie
 * du bonus « roule en groupe » pour tous les autres coureurs du groupe.
 */
export function laggardGroupContainingRider(state, rider) {
  const group = groupOfRider(state, rider);

  if (!group) return null;

  if (group.type !== 'retardataire') return null;

  if (group.count < 2) return null;

  return group;
}

/**
 * Ancienne fonction conservée pour compatibilité avec les autres modules.
 *
 * Elle retourne toujours un groupe lorsque le coureur est en tête d'un
 * groupe de poursuivants ou de retardataires.
 *
 * ATTENTION :
 * Le nouveau bonus « faire rouler le groupe » des retardataires n'utilise
 * plus cette fonction, car le baroudeur n'a plus besoin d'être en tête.
 */
export function headOfPursuitOrLaggardGroup(state, rider) {
  if (
    state.isTimeTrial ||
    rider.finished ||
    rider.column === null ||
    rider.column === undefined
  ) {
    return null;
  }

  const groups = computeGroups(state);

  for (const g of groups) {
    if (g.type !== 'poursuivant' && g.type !== 'retardataire') continue;
    if (g.count < 2) continue;
    if (!g.riders.includes(rider.id)) continue;

    if (g.headIds.includes(rider.id)) {
      return g;
    }
  }

  return null;
}