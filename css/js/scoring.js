// scoring.js — points d'étape façon classement par points (type Tour de France)
//
// Le vainqueur du classement général est celui qui cumule le plus de points
// sur l'ensemble des étapes (comme un maillot vert), et non celui qui met le
// moins de temps : chaque étape distribue un barème de points aux premiers
// arrivés, dont l'ampleur dépend du profil du terrain (une arrivée au sprint
// rapporte davantage qu'une arrivée en altitude, où l'écart entre les
// meilleurs grimpeurs compte plus que le fait d'être 1er ou 5e).

export const POINTS_SCALES = {
  plaine:   [50, 30, 20, 18, 16, 14, 12, 10, 8, 7, 6, 5, 4, 3, 2],
  vallonne: [30, 25, 22, 19, 17, 15, 13, 11, 9, 7, 6, 5, 4, 3, 2],
  montagne: [20, 17, 15, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  random:   [30, 25, 22, 19, 17, 15, 13, 11, 9, 7, 6, 5, 4, 3, 2],
};

export function pointsForRank(rank, profile) {
  const scale = POINTS_SCALES[profile] || POINTS_SCALES.random;
  if (!rank || rank < 1 || rank > scale.length) return 0;
  return scale[rank - 1];
}


// Barème fixe des points distribués aux features (sprints intermédiaires et
// cols), façon Tour de France. Les points des cols alimentent le classement
// du maillot à pois ; les points des sprints intermédiaires alimentent le
// classement du maillot vert (en plus des points d'arrivée).
//
// Les features "climb" portent une catégorie (null = hors-catégorie "HC", ou
// 1/2/3/4) qui détermine le barème appliqué. Le classement d'un col se fait
// à l'ordre de franchissement du sommet (columnEnd).

export const FEATURE_POINTS = {
  // Cols hors-catégorie
  HC: [20, 15, 12, 10, 8, 6, 4, 2],
  // Catégorie 1
  1:  [10, 8, 6, 4, 2, 1],
  // Catégorie 2
  2:  [5, 3, 2, 1],
  // Catégorie 3
  3:  [2, 1],
  // Catégorie 4
  4:  [1],
  // Sprint intermédiaire
  sprint: [25, 20, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
};

/** Renvoie le barème de points d'une feature donnée (climb ou sprint).
 *  Pour un col, la catégorie null est traitée comme hors-catégorie (HC). */
export function featureScale(feature) {
  if (!feature) return [];
  if (feature.type === 'sprint') return FEATURE_POINTS.sprint;
  if (feature.type === 'climb') {
    const cat = feature.category === null ? 'HC' : feature.category;
    return FEATURE_POINTS[cat] || [];
  }
  return [];
}

/** Renvoie les points attribués au `rank`-ième coureur à franchir une feature.
 *  rank commence à 1 (le premier au sommet/à la ligne). 0 si hors barème. */
export function featurePointsForRank(feature, rank) {
  const scale = featureScale(feature);
  if (!rank || rank < 1 || rank > scale.length) return 0;
  return scale[rank - 1];
}
