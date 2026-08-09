// ai.js — heuristique simple pour le choix de case des coureurs IA

/**
 * Choisit une case parmi les options atteignables (peuvent être à des
 * colonnes différentes, puisqu'une diagonale avance moins qu'une ligne
 * droite). L'IA privilégie la meilleure progression, puis la case la plus
 * dégagée pour la suite.
 */
export function aiChooseCell(state, rider, cells) {
  if (cells.length === 1) return cells[0];

  // 1) Priorité à la progression maximale (colonne la plus avancée)
  const maxColumn = Math.max(...cells.map(c => c.column));
  const bestByProgress = cells.filter(c => c.column === maxColumn);
  if (bestByProgress.length === 1) return bestByProgress[0];

  // 2) Parmi les meilleures, garde la voie actuelle si possible
  const keepLane = bestByProgress.find(c => c.lane === rider.lane);
  if (keepLane) return keepLane;

  // 3) Sinon, préfère une voie dégagée juste après (évite un re-blocage immédiat)
  const scored = bestByProgress.map(c => {
    const key = `${c.column + 1}-${c.lane}`;
    const clear = !state.occupancy.has(key);
    return { cell: c, score: clear ? 1 : 0 };
  });
  scored.sort((a, b) => b.score - a.score);
  const bestScore = scored[0].score;
  const bestCells = scored.filter(s => s.score === bestScore).map(s => s.cell);

  return bestCells[Math.floor(Math.random() * bestCells.length)];
}
