// state.js — état global de l'application (solo/hotseat/IA). Un seul objet
// mutable, importé et modifié en place par les autres modules — c'est
// exactement le comportement de l'ancien `main.js` monolithique, seulement
// déplacé ici pour que chaque écran puisse le lire/modifier sans dépendre
// du reste de l'orchestration.

/** Compare deux entrées du classement général au temps (maillot jaune) :
 *  le plus petit retard cumulé gagne ; à égalité, on compare les
 *  classements d'étape un par un (du plus ancien au plus récent) pour
 *  départager — mêmes règles que dans le jeu. */
export function compareYellow(entryA, entryB) {
  const ya = entryA.yellowPoints || 0;
  const yb = entryB.yellowPoints || 0;
  if (ya !== yb) return ya - yb;
  const ra = entryA.stageRanks || [];
  const rb = entryB.stageRanks || [];
  const n = Math.min(ra.length, rb.length);
  for (let i = 0; i < n; i++) {
    if (ra[i] !== rb[i]) return ra[i] - rb[i];
  }
  return 0;
}

export const App = {
  config: {
    raceCategory: 'classic',
    raceFormat: 'single',
    stageCount: 3,
    ttStageNumber: 0,
    terrainProfile: 'random',
    trackLength: 40,
    trackWidth: 3,
    gameMode: 'hotseat',
    humanCount: 2,
    aiCount: 1,
    eventsEnabled: false,
    twoDice: false,
  },
  teams: [],
  allRiders: null,
  stageIndex: 0,
  totalStages: 1,
  gc: new Map(), // riderId -> { name, teamColor, totalPoints }
  jerseys: null, // { yellow: riderId, green: riderId } — dispo à partir de l'étape 2
  runtime: null, // manche en cours
};
