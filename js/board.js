// board.js — génération procédurale du parcours

export const TERRAIN = {
  PLAINE: 'plaine',
  VALLON: 'vallon',
  MONTAGNE: 'montagne',
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

/**
 * Génère un tableau de terrains (un par case) selon un profil de course.
 * profile: 'random' | 'plaine' | 'vallonne' | 'montagne'
 */
function generateTerrainSequence(length, profile) {
  const terrain = new Array(length).fill(TERRAIN.PLAINE);

  // Les 3 premières et les 4 dernières cases sont toujours plates
  // (départ neutralisé + sprint final).
  const flatStart = 3;
  const flatEnd = 4;
  const bodyStart = flatStart;
  const bodyEnd = length - flatEnd;

  if (bodyEnd <= bodyStart) return terrain;

  // Construit des "blocs" de terrain successifs par marche aléatoire,
  // pondérés selon le profil choisi.
  const baseWeights = {
    plaine: { plaine: 0.6, vallon: 0.3, montagne: 0.1 },
    vallonne: { plaine: 0.25, vallon: 0.55, montagne: 0.2 },
    montagne: { plaine: 0.15, vallon: 0.35, montagne: 0.5 },
    random: { plaine: 0.4, vallon: 0.35, montagne: 0.25 },
  }[profile] || { plaine: 0.4, vallon: 0.35, montagne: 0.25 };

  // Un parcours n'a pas besoin de traverser les 3 types de terrain : une
  // fois sur deux environ, un des trois est exclu (tiré au hasard) et les
  // deux types restants se répartissent le poids du troisième.
  const weights = { ...baseWeights };
  if (Math.random() < 0.5) {
    const types = Object.keys(weights);
    const excluded = pick(types);
    const removedWeight = weights[excluded];
    weights[excluded] = 0;
    const remaining = types.filter(t => t !== excluded);
    const remainingTotal = remaining.reduce((sum, t) => sum + weights[t], 0) || 1;
    remaining.forEach(t => { weights[t] += removedWeight * (weights[t] / remainingTotal); });
  }

  let i = bodyStart;
  while (i < bodyEnd) {
    const blockLen = randInt(3, 6);
    const r = Math.random();
    let type;
    if (r < weights.plaine) type = TERRAIN.PLAINE;
    else if (r < weights.plaine + weights.vallon) type = TERRAIN.VALLON;
    else type = TERRAIN.MONTAGNE;

    for (let j = i; j < Math.min(i + blockLen, bodyEnd); j++) {
      terrain[j] = type;
    }
    i += blockLen;
  }

  return terrain;
}

/**
 * Crée un plateau : { length, width, terrain: [..], profile }
 * width = nombre de voies (colonnes latérales) — une route étroite
 * force les coureurs à se gêner et bloque les dépassements.
 */
export function generateBoard({ length = 40, width = 3, profile = 'random' } = {}) {
  const terrain = generateTerrainSequence(length, profile);
  return { length, width, terrain, profile, startDepth: 1 };
}

/**
 * Définit la profondeur de la zone de départ (en cases, avant la ligne de
 * départ à la colonne 0) en fonction du nombre total de coureurs à placer,
 * pour qu'il y ait toujours assez de cases libres pour tout le monde.
 */
/**
 * Définit la profondeur de la zone de départ (en cases, avant la ligne de
 * départ à la colonne 0) en fonction du nombre total de coureurs à placer,
 * avec une rangée de marge en plus pour que la grille de départ reste bien
 * lisible (tous les coureurs visibles, sans donner l'impression d'être
 * collés à la ligne).
 */
export function setStartDepth(board, totalRiders) {
  const rowsNeeded = Math.ceil(totalRiders / board.width);
  board.startDepth = Math.max(1, rowsNeeded);
  return board.startDepth;
}

export function terrainAt(board, column) {
  if (column < 0) return TERRAIN.PLAINE;
  if (column >= board.length) return TERRAIN.PLAINE;
  return board.terrain[column];
}

export function isSprintZone(board, column) {
  return column >= board.length - 4 && column < board.length;
}

/**
 * Crée un plateau à partir d'une étape prédéfinie.
 *
 * Contrairement à generateBoard(), aucune case n'est générée
 * aléatoirement.
 */
export function createFixedBoard(stage) {
  if (!stage || !Array.isArray(stage.terrain)) {
    throw new Error('Étape fixe invalide.');
  }

  if (stage.terrain.length !== stage.length) {
    throw new Error(
      `Plateau invalide : ${stage.terrain.length} terrains pour ${stage.length} cases.`
    );
  }

  return {
    length: stage.length,
    width: stage.width,
    terrain: [...stage.terrain],
    profile: stage.type,
    startDepth: 1,

    // Informations spécifiques au Tour
    tourStage: true,
    stageNumber: stage.number,
    stageName: stage.name,
    distance: stage.distance,
    scale: stage.scale,
    features: stage.features ? [...stage.features] : [],
  };
}