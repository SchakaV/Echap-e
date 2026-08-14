// state.js — état global de l'application (solo/hotseat/IA). Un seul objet
// mutable, importé et modifié en place par les autres modules — c'est
// exactement le comportement de l'ancien `main.js` monolithique, seulement
// déplacé ici pour que chaque écran puisse le lire/modifier sans dépendre
// du reste de l'orchestration.

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
  },
  teams: [],
  allRiders: null,
  stageIndex: 0,
  totalStages: 1,
  gc: new Map(), // riderId -> { name, teamColor, totalPoints }
  jerseys: null, // { yellow: riderId, green: riderId } — dispo à partir de l'étape 2
  runtime: null, // manche en cours
};
