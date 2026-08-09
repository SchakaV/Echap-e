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
